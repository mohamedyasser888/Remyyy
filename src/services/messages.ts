/**
 * Messages Service
 * User ↔ Admin messaging system
 * - Messages are NEVER deleted from DB (soft-delete only)
 * - Each side can delete their own view
 * - History persists forever
 */

import { supabase, supabaseAdmin } from './supabase';

// Admin login is handled by the app's own admin session, not a Supabase auth
// session. Use the service-role client for admin-only message operations so
// RLS does not hide conversations from the admin panel.
const adminDb = supabaseAdmin ?? supabase;

function getAdminDb() {
  if (!supabaseAdmin) {
    throw new Error('Admin messaging requires VITE_SUPABASE_SERVICE_ROLE_KEY to be configured.');
  }
  return adminDb;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  sender: 'user' | 'admin';
  deleted_by_user: boolean;
  deleted_by_admin: boolean;
  admin_read_at?: string | null;
  user_read_at?: string | null;
  created_at: string;
}

export interface ConversationSummary {
  user_id: string;
  display_name: string;
  last_message: string;
  last_message_time: string;
  unread: boolean; // has messages from user not yet seen
}

// ── Get messages for a user (filtered by soft-delete) ────────────────────────

export async function getMessages(
  userId: string,
  isAdmin: boolean
): Promise<{ messages: Message[]; error: Error | null }> {
  try {
    let query = (isAdmin ? getAdminDb() : supabase)
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!isAdmin) {
      // User sees all messages except ones they deleted
      query = query.eq('deleted_by_user', false);
    } else {
      // Admin sees all messages except ones admin deleted
      query = query.eq('deleted_by_admin', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { messages: data || [], error: null };
  } catch (error) {
    return { messages: [], error: error as Error };
  }
}

// ── Send a message ────────────────────────────────────────────────────────────

export async function sendMessage(
  userId: string,
  content: string,
  sender: 'user' | 'admin'
): Promise<{ message: Message | null; error: Error | null }> {
  try {
    const { data, error } = await (sender === 'admin' ? getAdminDb() : supabase)
      .from('messages')
      .insert({ user_id: userId, content: content.trim(), sender })
      .select()
      .single();

    if (error) throw error;
    return { message: data, error: null };
  } catch (error) {
    return { message: null, error: error as Error };
  }
}

// ── Soft-delete a message (only hides for that side) ─────────────────────────

export async function deleteMessage(
  messageId: string,
  isAdmin: boolean
): Promise<{ error: Error | null }> {
  try {
    const field = isAdmin ? 'deleted_by_admin' : 'deleted_by_user';
    const { error } = await (isAdmin ? getAdminDb() : supabase)
      .from('messages')
      .update({ [field]: true })
      .eq('id', messageId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function markConversationRead(userId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await getAdminDb().rpc('mark_messages_read', { target_user_id: userId });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function markUserConversationRead(userId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('mark_user_messages_read', { target_user_id: userId });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ── Get all conversations (admin only) ───────────────────────────────────────

export async function getAllConversations(): Promise<{
  conversations: ConversationSummary[];
  error: Error | null;
}> {
  try {
    const { data: messages, error: mErr } = await getAdminDb()
      .from('messages')
      .select('user_id, content, sender, created_at, deleted_by_admin, admin_read_at')
      .eq('deleted_by_admin', false)
      .order('created_at', { ascending: true }); // ascending so we can check last msg

    if (mErr) throw mErr;

    // Load all profiles, not only users who already sent a message. This lets
    // the admin see every registered user and start a new conversation.
    const { data: profiles, error: pErr } = await getAdminDb()
      .from('profiles')
      .select('*');

    if (pErr) throw pErr;

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: Record<string, unknown>) => {
      const name =
        (p.display_name as string | null) ||
        (p.full_name   as string | null) ||
        (p.name        as string | null) ||
        (p.username    as string | null) ||
        null;
      if (name) profileMap[p.id as string] = name;
    });

    // For users still missing a name, read directly from auth.users via admin client
    if (supabaseAdmin) {
      const adminClient = supabaseAdmin; // non-null inside the block
      const missingIds = [...new Set((messages || []).map(m => m.user_id))].filter(id => !profileMap[id]);
      await Promise.all(missingIds.map(async (id) => {
        const { data } = await adminClient.auth.admin.getUserById(id);
        const meta = data?.user?.user_metadata;
        const name =
          meta?.display_name ||
          meta?.full_name    ||
          meta?.name         ||
          data?.user?.email  ||
          null;
        if (name) profileMap[id] = name;
      }));
    }

    // Group by user
    const convMap: Record<string, { msgs: typeof messages }> = {};
    (messages || []).forEach(msg => {
      if (!convMap[msg.user_id]) convMap[msg.user_id] = { msgs: [] };
      convMap[msg.user_id].msgs.push(msg);
    });

    const profileRows = (profiles || []) as Array<Record<string, unknown>>;
    const allUserIds = new Set([
      ...profileRows.map(profile => profile.id as string),
      ...(messages || []).map(message => message.user_id),
    ]);

    const conversations: ConversationSummary[] = [...allUserIds].map(user_id => {
      const msgs = convMap[user_id]?.msgs || [];
      const lastMsg = msgs[msgs.length - 1];
      // Only user messages received after the admin last opened the conversation are unread.
      const unread = msgs.some(msg =>
        msg.sender === 'user' &&
        (!msg.admin_read_at || new Date(msg.created_at).getTime() > new Date(msg.admin_read_at).getTime())
      );

      return {
        user_id,
        display_name:      profileMap[user_id] || `User ${user_id.slice(0, 8)}`,
        last_message:      lastMsg?.content || 'No messages yet',
        last_message_time: lastMsg?.created_at || new Date(0).toISOString(),
        unread,
      };
    });

    // Sort by latest message
    conversations.sort((a, b) =>
      new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );

    return { conversations, error: null };
  } catch (error) {
    return { conversations: [], error: error as Error };
  }
}

// ── Count unread conversations (for red dot) — only where last msg is from user ──

export async function getUnreadCount(): Promise<number> {
  try {
    const { conversations } = await getAllConversations();
    return conversations.filter(c => c.unread).length;
  } catch {
    return 0;
  }
}

// ── Subscribe to new messages (real-time) ────────────────────────────────────

export function subscribeToMessages(
  userId: string,
  onNew: (msg: Message) => void
) {
  const channel = supabase
    .channel(`messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_id=eq.${userId}`,
      },
      payload => onNew(payload.new as Message)
    )
    .subscribe();

  // Return sync cleanup — fire-and-forget the async remove
  return () => { supabase.removeChannel(channel); };
}
