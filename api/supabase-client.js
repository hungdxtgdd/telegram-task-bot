/**
 * Supabase Client Helper
 * Sử dụng Supabase JS client thay vì direct PostgreSQL connection
 * Để bypass DNS resolution issues trong Vercel serverless environment
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kmsagdohchxuxllbhiye.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc2FnZG9oY2h4dXhsbGJoaXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzY0NzgsImV4cCI6MjA3NzgxMjQ3OH0._TRC4Trs1xQumlk2SAv47AxT7JxfIreDgaZ8Fj1UZdQ';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// Log initialization
console.log('🔍 Initializing Supabase client...');
console.log('📡 Supabase URL:', SUPABASE_URL);
console.log('📡 Has API Key:', !!SUPABASE_ANON_KEY);

// Create Supabase client với service role key (có quyền đọc database)
// Service role key bypass RLS và có full access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function để query database như PostgreSQL
async function queryDatabase(query, params = []) {
  try {
    // Supabase client sử dụng REST API, không hỗ trợ raw SQL queries trực tiếp
    // Cần dùng .from() cho table queries
    // Hoặc dùng PostgREST syntax
    
    // For now, return null để fallback về direct connection nếu cần
    return null;
  } catch (error) {
    console.error('Supabase query error:', error);
    throw error;
  }
}

// Helper function để get user by username
async function getUserByUsername(username) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Supabase getUserByUsername error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase getUserByUsername exception:', error);
    return null;
  }
}

// Helper function để get user by ID
async function getUserById(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, role, is_active')
      .eq('id', userId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Supabase getUserById error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase getUserById exception:', error);
    return null;
  }
}

// Helper function để update last login
async function updateLastLogin(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) {
      console.error('Supabase updateLastLogin error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase updateLastLogin exception:', error);
    return false;
  }
}

// OKR helper functions
async function getAllOKRs() {
  try {
    const { data, error } = await supabase
      .from('okrs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase getAllOKRs error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase getAllOKRs exception:', error);
    return null;
  }
}

async function getOKRById(okrId) {
  try {
    const { data, error } = await supabase
      .from('okrs')
      .select('*')
      .eq('id', okrId)
      .single();
    
    if (error) {
      console.error('Supabase getOKRById error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase getOKRById exception:', error);
    return null;
  }
}

async function createOKR(okrData) {
  try {
    const { data, error } = await supabase
      .from('okrs')
      .insert(okrData)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase createOKR error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase createOKR exception:', error);
    return null;
  }
}

async function updateOKR(okrId, updates) {
  try {
    const { data, error } = await supabase
      .from('okrs')
      .update(updates)
      .eq('id', okrId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase updateOKR error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase updateOKR exception:', error);
    return null;
  }
}

async function deleteOKR(okrId) {
  try {
    const { data, error } = await supabase
      .from('okrs')
      .delete()
      .eq('id', okrId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase deleteOKR error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase deleteOKR exception:', error);
    return null;
  }
}

async function getOKREditHistory(okrId) {
  try {
    const { data, error } = await supabase
      .from('okr_edit_history')
      .select('username, field_name, old_value, new_value, edited_at')
      .eq('okr_id', okrId)
      .order('edited_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Supabase getOKREditHistory error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase getOKREditHistory exception:', error);
    return null;
  }
}

async function getProjectsByOKRId(okrId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, project_code, status')
      .eq('okr_id', okrId);
    
    if (error) {
      console.error('Supabase getProjectsByOKRId error:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Supabase getProjectsByOKRId exception:', error);
    return [];
  }
}

async function insertOKREditHistory(historyData) {
  try {
    const { data, error } = await supabase
      .from('okr_edit_history')
      .insert(historyData)
      .select();
    
    if (error) {
      console.error('Supabase insertOKREditHistory error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase insertOKREditHistory exception:', error);
    return false;
  }
}

async function updateProjectsOKRId(projectIds, okrId) {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ okr_id: okrId })
      .in('id', projectIds);
    
    if (error) {
      console.error('Supabase updateProjectsOKRId error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase updateProjectsOKRId exception:', error);
    return false;
  }
}

// Project helper functions
async function getAllProjects(filters = {}) {
  try {
    let query = supabase.from('projects').select('*');
    
    if (filters.okr_id) {
      query = query.eq('okr_id', filters.okr_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase getAllProjects error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase getAllProjects exception:', error);
    return null;
  }
}

async function getProjectById(projectId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) {
      console.error('Supabase getProjectById error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase getProjectById exception:', error);
    return null;
  }
}

async function createProject(projectData) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase createProject error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase createProject exception:', error);
    return null;
  }
}

async function updateProject(projectId, updates) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase updateProject error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase updateProject exception:', error);
    return null;
  }
}

async function deleteProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase deleteProject error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase deleteProject exception:', error);
    return null;
  }
}

async function getProjectTasks(projectId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase getProjectTasks error:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Supabase getProjectTasks exception:', error);
    return [];
  }
}

async function getProjectMembers(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_members')
      .select('*, users(*)')
      .eq('project_id', projectId);
    
    if (error) {
      console.error('Supabase getProjectMembers error:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Supabase getProjectMembers exception:', error);
    return [];
  }
}

async function addProjectMember(projectId, userId, role = 'member') {
  try {
    // Use upsert to handle ON CONFLICT (update if exists, insert if not)
    const { data, error } = await supabase
      .from('project_members')
      .upsert({
        project_id: projectId,
        user_id: userId,
        role: role,
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'project_id,user_id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase addProjectMember error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase addProjectMember exception:', error);
    return null;
  }
}

async function removeProjectMember(projectId, userId) {
  try {
    const { data, error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase removeProjectMember error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Supabase removeProjectMember exception:', error);
    return null;
  }
}

async function getProjectCount() {
  try {
    const { count, error } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase getProjectCount error:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Supabase getProjectCount exception:', error);
    return 0;
  }
}

module.exports = {
  supabase,
  queryDatabase,
  getUserByUsername,
  getUserById,
  updateLastLogin,
  getAllOKRs,
  getOKRById,
  createOKR,
  updateOKR,
  deleteOKR,
  getOKREditHistory,
  getProjectsByOKRId,
  insertOKREditHistory,
  updateProjectsOKRId,
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getProjectCount
};

