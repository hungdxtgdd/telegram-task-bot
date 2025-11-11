require('dotenv').config();
const { verifyToken, requireAdmin, requireAdminOrManager } = require('./auth');
const { createPool } = require('./db-utils');
const {
  getAllProjects: supabaseGetAllProjects,
  getProjectById: supabaseGetProjectById,
  createProject: supabaseCreateProject,
  updateProject: supabaseUpdateProject,
  deleteProject: supabaseDeleteProject,
  getProjectTasks: supabaseGetProjectTasks,
  getProjectMembers: supabaseGetProjectMembers,
  addProjectMember: supabaseAddProjectMember,
  removeProjectMember: supabaseRemoveProjectMember,
  getProjectCount,
  getUserById,
  supabase
} = require('./supabase-client');

const DATABASE_URL = process.env.DATABASE_URL;

// Create pool only if DATABASE_URL is available (optional for Supabase client usage)
let pool = null;
if (DATABASE_URL) {
  try {
    pool = createPool(DATABASE_URL);
    console.log('📡 Direct PostgreSQL connection available as fallback');
  } catch (error) {
    console.warn('⚠️ Direct connection initialization failed:', error.message);
  }
} else {
  console.log('📡 Using Supabase client only (no DATABASE_URL) - some endpoints may not work');
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication for all Project operations
  verifyToken(req, res, async () => {
    await handleProjectRequest(req, res);
  });
};

async function handleProjectRequest(req, res) {
  // Use Supabase client (no need for pool check)
  console.log('✅ Projects endpoint: Using Supabase client');

  const { method, url } = req;
  
  try {
    // Parse URL to get endpoint and project ID
    // Remove leading slash and split
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const urlParts = cleanUrl.split('?')[0].split('/').filter(part => part !== '');
    const lastPart = urlParts[urlParts.length - 1];
    const secondLastPart = urlParts[urlParts.length - 2];
    
    // Check if last part is a number (project ID)
    const projectId = !isNaN(lastPart) ? lastPart : null;
    const endpoint = projectId ? secondLastPart : lastPart;
    
    console.log('URL parsing:', { url, cleanUrl, urlParts, projectId, endpoint });

    switch (method) {
      case 'GET':
        if (endpoint === 'projects' && !projectId) {
          await getAllProjects(req, res);
        } else if (projectId && !isNaN(projectId)) {
          await getProjectById(req, res, projectId);
        } else if (endpoint === 'tasks' && projectId) {
          await getProjectTasks(req, res, projectId);
        } else if (endpoint === 'members' && projectId) {
          await getProjectMembers(req, res, projectId);
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
        
      case 'POST':
        if (endpoint === 'projects') {
          requireAdminOrManager(req, res, () => createProject(req, res));
        } else if (endpoint === 'members' && projectId) {
          requireAdminOrManager(req, res, () => addProjectMember(req, res, projectId));
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
        
      case 'PUT':
        if (projectId && !isNaN(projectId)) {
          requireAdminOrManager(req, res, () => updateProject(req, res, projectId));
        } else {
          res.status(404).json({ error: 'Project ID required' });
        }
        break;
        
      case 'DELETE':
        console.log('DELETE request:', { projectId, endpoint, isNaN: isNaN(projectId), url, urlParts });
        if (projectId && !isNaN(projectId)) {
          if (endpoint === 'members') {
            requireAdminOrManager(req, res, () => removeProjectMember(req, res, projectId));
          } else {
            console.log('Calling deleteProject with ID:', projectId);
            console.log('Checking admin/manager permission for user:', req.user);
            requireAdminOrManager(req, res, () => deleteProject(req, res, projectId));
          }
        } else {
          console.log('DELETE failed - Project ID required:', { projectId, endpoint, url, urlParts });
          res.status(404).json({ error: 'Project ID required' });
        }
        break;
        
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Project API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to calculate project health
function calculateHealth(project, taskStats) {
  const completionPercentage = taskStats.completion_percentage || 0;
  const endDate = project.end_date ? new Date(project.end_date) : null;
  const today = new Date();
  const daysUntilDeadline = endDate ? Math.floor((endDate - today) / (1000 * 60 * 60 * 24)) : null;
  
  const targetValue = parseFloat(project.target_value) || 0;
  const currentValue = parseFloat(project.current_value) || 0;
  const progressPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  
  // Excellent: High completion, not overdue, good progress
  if (completionPercentage >= 90 
      && (!endDate || endDate >= today)
      && (targetValue === 0 || progressPercentage >= 80)) {
    return 'excellent';
  }
  
  // Critical: Low completion, overdue, or very low progress
  if (completionPercentage < 50 
      || (endDate && endDate < today)
      || (daysUntilDeadline !== null && daysUntilDeadline < 7)
      || (targetValue > 0 && progressPercentage < 30)) {
    return 'critical';
  }
  
  // Warning: Medium completion or approaching deadline
  if (completionPercentage < 70 
      || (daysUntilDeadline !== null && daysUntilDeadline < 14)
      || (targetValue > 0 && progressPercentage < 50)) {
    return 'warning';
  }
  
  // Good: Default good status
  return 'good';
}

// Get all Projects
async function getAllProjects(req, res) {
  try {
    const { okr_id, status, priority, health } = req.query;
    
    // Build filters
    const filters = {};
    if (okr_id) filters.okr_id = parseInt(okr_id);
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    
    // Get projects from Supabase
    let projects = await supabaseGetAllProjects(filters);
    
    if (!projects) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = 'SELECT * FROM projects ORDER BY created_at DESC';
          const result = await client.query(query);
          projects = result.rows;
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi lấy danh sách dự án' });
      }
    }
    
    // Enrich projects with additional data
    const enrichedProjects = await Promise.all(projects.map(async (project) => {
      // Get OKR objective
      let okrObjective = null;
      if (project.okr_id) {
        const okr = await supabase.from('okrs').select('objective').eq('id', project.okr_id).single();
        okrObjective = okr.data?.objective || null;
      }
      
      // Get created_by name
      let createdByName = null;
      if (project.created_by) {
        const creator = await getUserById(project.created_by);
        createdByName = creator?.full_name || null;
      }
      
      // Get project manager name
      let projectManagerName = null;
      if (project.project_manager) {
        const manager = await getUserById(project.project_manager);
        projectManagerName = manager?.full_name || null;
      }
      
      // Get task stats
      const tasks = await supabaseGetProjectTasks(project.id);
      const taskCount = tasks.length;
      const completedTasks = tasks.filter(t => ['Done', 'completed', 'done'].includes(t.status)).length;
      const completionPercentage = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100 * 100) / 100 : 0;
      
      // Calculate health
      const calculatedHealth = calculateHealth(project, { completion_percentage: completionPercentage });
      
      // Get member count
      const members = await supabaseGetProjectMembers(project.id);
      const memberCount = members.length;
      
      return {
        ...project,
        okr_objective: okrObjective,
        created_by_name: createdByName,
        project_manager_name: projectManagerName,
        task_count: taskCount,
        completed_tasks: completedTasks,
        completion_percentage: completionPercentage,
        health: project.health || calculatedHealth,
        member_count: memberCount
      };
    }));
    
    // Filter by health if specified
    let filteredProjects = enrichedProjects;
    if (health) {
      filteredProjects = enrichedProjects.filter(p => p.health === health);
    }
    
    res.status(200).json(filteredProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách dự án' });
  }
}

// Get Project by ID
async function getProjectById(req, res, projectId) {
  try {
    let project = await supabaseGetProjectById(projectId);
    
    if (!project) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = 'SELECT * FROM projects WHERE id = $1';
          const result = await client.query(query, [projectId]);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dự án không tồn tại' });
          }
          project = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Dự án không tồn tại' });
      }
    }
    
    // Enrich with additional data
    let okrObjective = null;
    if (project.okr_id) {
      const okr = await supabase.from('okrs').select('objective').eq('id', project.okr_id).single();
      okrObjective = okr.data?.objective || null;
    }
    
    let createdByName = null;
    if (project.created_by) {
      const creator = await getUserById(project.created_by);
      createdByName = creator?.full_name || null;
    }
    
    let projectManagerName = null;
    if (project.project_manager) {
      const manager = await getUserById(project.project_manager);
      projectManagerName = manager?.full_name || null;
    }
    
    // Get task stats
    const tasks = await supabaseGetProjectTasks(project.id);
    const taskCount = tasks.length;
    const completedTasks = tasks.filter(t => ['Done', 'completed', 'done'].includes(t.status)).length;
    const completionPercentage = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100 * 100) / 100 : 0;
    
    // Calculate health
    const calculatedHealth = calculateHealth(project, { completion_percentage: completionPercentage });
    
    // Get member count
    const members = await supabaseGetProjectMembers(project.id);
    const memberCount = members.length;
    
    // Update health in database if different
    if (project.health !== calculatedHealth) {
      await supabaseUpdateProject(projectId, { health: calculatedHealth });
    }
    
    const enrichedProject = {
      ...project,
      okr_objective: okrObjective,
      created_by_name: createdByName,
      project_manager_name: projectManagerName,
      task_count: taskCount,
      completed_tasks: completedTasks,
      completion_percentage: completionPercentage,
      health: calculatedHealth,
      member_count: memberCount
    };
    
    res.status(200).json(enrichedProject);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Lỗi khi lấy dự án' });
  }
}

// Get Project Tasks
async function getProjectTasks(req, res, projectId) {
  try {
    let tasks = await supabaseGetProjectTasks(projectId);
    
    if (!tasks) {
      tasks = [];
    }
    
    // Enrich with assignee info
    const enrichedTasks = await Promise.all(tasks.map(async (task) => {
      let assigneeName = null;
      let assigneeUsername = null;
      let assigneeEmail = null;
      
      if (task.assignee_id) {
        const assignee = await getUserById(task.assignee_id);
        if (assignee) {
          assigneeName = assignee.full_name || null;
          assigneeUsername = assignee.username || null;
          assigneeEmail = assignee.email || null;
        }
      }
      
      return {
        ...task,
        assignee_name: assigneeName,
        assignee_username: assigneeUsername,
        assignee_email: assigneeEmail
      };
    }));
    
    res.status(200).json(enrichedTasks);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ error: 'Lỗi khi lấy tasks của dự án' });
  }
}

// Get Project Members
async function getProjectMembers(req, res, projectId) {
  try {
    const members = await supabaseGetProjectMembers(projectId);
    
    // Members already include user data from Supabase join
    res.status(200).json(members || []);
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thành viên dự án' });
  }
}

// Create new Project
async function createProject(req, res) {
  try {
    console.log('createProject called with body:', req.body);
    
    const {
      okr_id,
      project_name,
      description,
      priority,
      status,
      start_date,
      end_date,
      deadline,
      target_value,
      unit,
      budget,
      project_manager
    } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: 'Tên dự án là bắt buộc' });
    }

    // Generate project_code automatically
    let projectCount = await getProjectCount();
    if (!projectCount && pool) {
      // Fallback to direct connection if available
      const client = await pool.connect();
      try {
        const countQuery = 'SELECT COUNT(*) as count FROM projects';
        const countResult = await client.query(countQuery);
        projectCount = parseInt(countResult.rows[0].count);
      } finally {
        client.release();
      }
    }
    const project_code = `P${String((projectCount || 0) + 1).padStart(4, '0')}`;
    
    console.log('Generated project_code:', project_code);
    
    const projectData = {
      okr_id: okr_id || null,
      project_code,
      project_name,
      description: description || null,
      priority: priority || 'Medium',
      status: status || 'active',
      start_date: start_date || null,
      end_date: end_date || null,
      target_value: target_value || null,
      unit: unit || '%',
      budget: budget || null,
      project_manager: project_manager || null,
      created_by: req.user.id,
      health: 'good',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    let project = await supabaseCreateProject(projectData);
    
    if (!project) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = `
            INSERT INTO projects (
              okr_id, project_code, project_name, description, priority, status,
              start_date, end_date, target_value, unit, budget, project_manager, created_by, health,
              created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'good', NOW(), NOW())
            RETURNING *
          `;
          const values = [
            okr_id || null,
            project_code,
            project_name,
            description || null,
            priority || 'Medium',
            status || 'active',
            start_date || null,
            end_date || null,
            target_value || null,
            unit || '%',
            budget || null,
            project_manager || null,
            req.user.id
          ];
          const result = await client.query(query, values);
          project = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi tạo dự án' });
      }
    }
    
    // Add creator as project owner
    try {
      await supabaseAddProjectMember(project.id, req.user.id, 'owner');
    } catch (e) {
      console.warn('Could not add creator as owner:', e.message);
    }
    
    res.status(201).json({
      message: 'Tạo dự án thành công',
      project: project
    });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Mã dự án đã tồn tại' });
    } else {
      res.status(500).json({ error: 'Lỗi khi tạo dự án' });
    }
  }
}

// Update Project
async function updateProject(req, res, projectId) {
  try {
    console.log('updateProject called with:', { projectId, body: req.body });
    
    const {
      okr_id,
      project_code,
      project_name,
      description,
      status,
      priority,
      start_date,
      end_date,
      target_value,
      unit,
      current_value,
      budget,
      project_manager
    } = req.body;

    // Build update object (only include fields that are provided)
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    if (okr_id !== undefined) updates.okr_id = okr_id;
    if (project_code !== undefined) updates.project_code = project_code;
    if (project_name !== undefined) updates.project_name = project_name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (target_value !== undefined) updates.target_value = target_value;
    if (unit !== undefined) updates.unit = unit;
    if (current_value !== undefined) updates.current_value = current_value;
    if (budget !== undefined) updates.budget = budget;
    if (project_manager !== undefined) updates.project_manager = project_manager;

    let project = await supabaseUpdateProject(projectId, updates);
    
    if (!project) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = `
            UPDATE projects
            SET
              okr_id = COALESCE($2, okr_id),
              project_code = COALESCE($3, project_code),
              project_name = COALESCE($4, project_name),
              description = COALESCE($5, description),
              status = COALESCE($6, status),
              priority = COALESCE($7, priority),
              start_date = COALESCE($8, start_date),
              end_date = COALESCE($9, end_date),
              target_value = COALESCE($10, target_value),
              unit = COALESCE($11, unit),
              current_value = COALESCE($12, current_value),
              budget = COALESCE($13, budget),
              project_manager = COALESCE($14, project_manager),
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `;
          const values = [
            projectId,
            okr_id,
            project_code,
            project_name,
            description,
            status,
            priority,
            start_date,
            end_date,
            target_value,
            unit,
            current_value,
            budget,
            project_manager
          ];
          const result = await client.query(query, values);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dự án không tồn tại' });
          }
          project = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Dự án không tồn tại' });
      }
    }
    
    // Recalculate health status after update
    const tasks = await supabaseGetProjectTasks(projectId);
    const taskCount = tasks.length;
    const completedTasks = tasks.filter(t => ['Done', 'completed', 'done'].includes(t.status)).length;
    const completionPercentage = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100 * 100) / 100 : 0;
    const calculatedHealth = calculateHealth(project, { completion_percentage: completionPercentage });
    
    // Update health if different
    if (project.health !== calculatedHealth) {
      await supabaseUpdateProject(projectId, { health: calculatedHealth });
      project.health = calculatedHealth;
    }
    
    res.status(200).json({
      message: 'Cập nhật dự án thành công',
      project: project
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật dự án' });
  }
}

// Delete Project
async function deleteProject(req, res, projectId) {
  try {
    console.log('deleteProject called with:', { projectId, user: req.user });
    
    // First, unlink related tasks (set project_id to NULL instead of deleting)
    try {
      await supabase.from('tasks').update({ project_id: null }).eq('project_id', projectId);
      console.log('Unlinked related tasks for project:', projectId);
    } catch (e) {
      // If Supabase fails, try direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('UPDATE tasks SET project_id = NULL WHERE project_id = $1', [projectId]);
        } finally {
          client.release();
        }
      }
      console.warn('Could not unlink tasks:', e.message);
    }
    
    // Then delete the project
    const deletedProject = await supabaseDeleteProject(projectId);
    
    if (!deletedProject) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = 'DELETE FROM projects WHERE id = $1 RETURNING *';
          const result = await client.query(query, [projectId]);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dự án không tồn tại' });
          }
          return res.status(200).json({
            message: 'Xóa dự án thành công',
            project: result.rows[0]
          });
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Dự án không tồn tại' });
      }
    }
    
    console.log('Project deleted successfully:', deletedProject);
    
    res.status(200).json({
      message: 'Xóa dự án thành công',
      project: deletedProject
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Lỗi khi xóa dự án: ' + error.message });
  }
}

// Add Project Member
async function addProjectMember(req, res, projectId) {
  try {
    const { user_id, role = 'member' } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID là bắt buộc' });
    }

    let member = await supabaseAddProjectMember(projectId, user_id, role);
    
    if (!member) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = `
            INSERT INTO project_members (project_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (project_id, user_id) 
            DO UPDATE SET role = $3, joined_at = NOW()
            RETURNING *
          `;
          const result = await client.query(query, [projectId, user_id, role]);
          member = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi thêm thành viên' });
      }
    }
    
    res.status(201).json({
      message: 'Thêm thành viên thành công',
      member: member
    });
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ error: 'Lỗi khi thêm thành viên' });
  }
}

// Remove Project Member
async function removeProjectMember(req, res, projectId) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID là bắt buộc' });
    }

    const deletedMember = await supabaseRemoveProjectMember(projectId, user_id);
    
    if (!deletedMember) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = 'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *';
          const result = await client.query(query, [projectId, user_id]);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Thành viên không tồn tại trong dự án' });
          }
          return res.status(200).json({
            message: 'Xóa thành viên thành công',
            member: result.rows[0]
          });
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Thành viên không tồn tại trong dự án' });
      }
    }
    
    res.status(200).json({
      message: 'Xóa thành viên thành công',
      member: deletedMember
    });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ error: 'Lỗi khi xóa thành viên' });
  }
}

