import { createClient } from './client';

const supabase = createClient();

type EntityType = 'tasks' | 'classes' | 'subjects' | 'notes' | 'files' | 'saved_chats' | 'notifications' | 'profiles' | 'ai_config';

interface SyncOptions {
  entity: EntityType;
  userId: string;
  localData: any[];
  remoteData: any[];
  idField?: string;
}

function getIdField(entity: EntityType): string {
  const idFields: Record<EntityType, string> = {
    tasks: 'id',
    classes: 'id',
    subjects: 'id',
    notes: 'id',
    files: 'id',
    saved_chats: 'id',
    notifications: 'id',
    profiles: 'user_id',
    ai_config: 'user_id',
  };
  return idFields[entity];
}

function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  const idField = a[0]?.id ? 'id' : 'user_id';
  const sortedA = [...a].sort((x, y) => (x[idField] || '').localeCompare(y[idField] || ''));
  const sortedB = [...b].sort((x, y) => (x[idField] || '').localeCompare(y[idField] || ''));
  return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

export async function syncEntity(options: SyncOptions): Promise<any[]> {
  const { entity, userId, localData, remoteData, idField = 'id' } = options;
  
  const localMap = new Map(localData.map(item => [item[idField], item]));
  const remoteMap = new Map(remoteData.map(item => [item[idField], item]));
  
  const merged = new Map<string, any>();
  
  for (const [id, localItem] of localMap) {
    const remoteItem = remoteMap.get(id);
    if (!remoteItem) {
      merged.set(id, { ...localItem, _sync: 'push' });
    } else {
      const localUpdated = new Date(localItem.updated_at || 0).getTime();
      const remoteUpdated = new Date(remoteItem.updated_at || 0).getTime();
      merged.set(id, localUpdated >= remoteUpdated ? { ...localItem, _sync: 'push' } : { ...remoteItem, _sync: 'pull' });
    }
  }
  
  for (const [id, remoteItem] of remoteMap) {
    if (!localMap.has(id)) {
      merged.set(id, { ...remoteItem, _sync: 'pull' });
    }
  }
  
  const toPush = Array.from(merged.values()).filter(item => item._sync === 'push');
  const toPull = Array.from(merged.values()).filter(item => item._sync === 'pull');
  
  if (toPush.length > 0) {
    const { error } = await supabase
      .from(entity)
      .upsert(toPush.map(item => {
        const { _sync, ...rest } = item;
        return { ...rest, user_id: userId };
      }), { onConflict: 'id' });
    
    if (error) {
      console.error(`Failed to push ${entity}:`, error);
    }
  }
  
  return toPull.map(item => {
    const { _sync, ...rest } = item;
    return rest;
  });
}

export async function fetchAllEntities(userId: string) {
  const entities: EntityType[] = ['tasks', 'classes', 'subjects', 'notes', 'files', 'saved_chats', 'notifications', 'profiles', 'ai_config'];
  const results: Record<string, any[]> = {};
  
  for (const entity of entities) {
    try {
      let query = supabase.from(entity).select('*');
      
      if (entity === 'profiles' || entity === 'ai_config') {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        results[entity] = data;
      }
    } catch (error) {
      console.error(`Failed to fetch ${entity}:`, error);
      results[entity] = [];
    }
  }
  
  return results;
}

export async function pushAllEntities(userId: string, localState: any) {
  const entities = [
    { key: 'tasks', entity: 'tasks' as EntityType },
    { key: 'classes', entity: 'classes' as EntityType },
    { key: 'subjects', entity: 'subjects' as EntityType },
    { key: 'notes', entity: 'notes' as EntityType },
    { key: 'files', entity: 'files' as EntityType },
    { key: 'savedChats', entity: 'saved_chats' as EntityType },
    { key: 'notifications', entity: 'notifications' as EntityType },
  ];
  
  for (const { key, entity } of entities) {
    const localData = localState[key] || [];
    if (localData.length > 0) {
      const { error } = await supabase
        .from(entity)
        .upsert(localData.map((item: any) => ({ ...item, user_id: userId })), { onConflict: 'id' });
      
      if (error) {
        console.error(`Failed to push ${entity}:`, error);
      }
    }
  }
  
  if (localState.preferences) {
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, ...localState.preferences, updated_at: new Date().toISOString() });
    if (error) console.error('Failed to push preferences:', error);
  }
  
  if (localState.aiConfig) {
    const { error } = await supabase
      .from('ai_config')
      .upsert({ user_id: userId, ...localState.aiConfig, updated_at: new Date().toISOString() });
    if (error) console.error('Failed to push ai_config:', error);
  }
}