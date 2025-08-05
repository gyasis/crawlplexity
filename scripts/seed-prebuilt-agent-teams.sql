-- Seed prebuilt agent teams as specified in the PRD
-- These teams provide predefined combinations for common use cases

-- Clear existing test data
DELETE FROM agent_team_members WHERE team_id LIKE 'Test Group%';
DELETE FROM agent_teams WHERE team_id LIKE 'Test Group%';

-- Research Team: Research Assistant + Conversation Manager
INSERT OR REPLACE INTO agent_teams (
  team_id, 
  name, 
  description,
  created_at,
  updated_at
) VALUES (
  'research-team',
  'Research Team', 
  'Specialized team for research tasks with comprehensive analysis and response generation',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Development Team: Coding Assistant + Conversation Manager  
INSERT OR REPLACE INTO agent_teams (
  team_id,
  name,
  description,
  created_at,
  updated_at
) VALUES (
  'development-team',
  'Development Team',
  'Focused on software development, coding assistance, and technical problem solving',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Analysis Team: Research Assistant + Data Analysis capabilities
INSERT OR REPLACE INTO agent_teams (
  team_id,
  name, 
  description,
  created_at,
  updated_at
) VALUES (
  'analysis-team',
  'Analysis Team',
  'Data analysis, research synthesis, and insights generation for complex information processing',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Full Stack Team: All available agents working together
INSERT OR REPLACE INTO agent_teams (
  team_id,
  name,
  description,
  created_at,
  updated_at
) VALUES (
  'full-stack-team',
  'Full Stack Team',
  'Complete agent ensemble for complex, multi-faceted tasks requiring diverse expertise',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Now add team members based on available agents
-- Research Team members
INSERT OR REPLACE INTO agent_team_members (agent_id, team_id, role, priority)
SELECT 'research-assistant', 'research-team', 'leader', 1
WHERE EXISTS (SELECT 1 FROM agents WHERE agent_id = 'research-assistant');

INSERT OR REPLACE INTO agent_team_members (agent_id, team_id, role, priority)  
SELECT 'conversation-manager', 'research-team', 'member', 2
WHERE EXISTS (SELECT 1 FROM agents WHERE agent_id = 'conversation-manager');

-- Development Team members
INSERT OR REPLACE INTO agent_team_members (agent_id, team_id, role, priority)
SELECT 'coding-assistant', 'development-team', 'leader', 1  
WHERE EXISTS (SELECT 1 FROM agents WHERE agent_id = 'coding-assistant');

INSERT OR REPLACE INTO agent_team_members (agent_id, team_id, role, priority)
SELECT 'conversation-manager', 'development-team', 'member', 2
WHERE EXISTS (SELECT 1 FROM agents WHERE agent_id = 'conversation-manager');

-- Analysis Team members  
INSERT OR REPLACE INTO agent_team_members (agent_id, team_id, role, priority)
SELECT 'research-assistant', 'analysis-team', 'leader', 1
WHERE EXISTS (SELECT 1 FROM agents WHERE agent_id = 'research-assistant');

-- Add any available data/analysis agents if they exist
INSERT OR REPLACE INTO agent_team_members (agent_id, team_id, role, priority)
SELECT agent_id, 'analysis-team', 'specialist', 2
FROM agents 
WHERE agent_type LIKE '%analysis%' OR agent_type LIKE '%data%' 
  AND agent_id NOT IN (SELECT agent_id FROM agent_team_members WHERE team_id = 'analysis-team');

-- Full Stack Team - add all available agents
INSERT OR REPLACE INTO agent_team_members (agent_id, team_id, role, priority)
SELECT agent_id, 'full-stack-team', 
  CASE 
    WHEN agent_id LIKE '%conversation%' THEN 'leader'
    WHEN agent_id LIKE '%research%' THEN 'specialist' 
    WHEN agent_id LIKE '%coding%' THEN 'specialist'
    ELSE 'member'
  END as role,
  ROW_NUMBER() OVER (ORDER BY 
    CASE 
      WHEN agent_id LIKE '%conversation%' THEN 1
      WHEN agent_id LIKE '%research%' THEN 2
      WHEN agent_id LIKE '%coding%' THEN 3  
      ELSE 4
    END
  ) as priority
FROM agents;

-- Create some example orchestration rules for the teams
INSERT OR REPLACE INTO orchestration_rules (
  rule_id,
  team_id,
  rule_name,
  rule_type,
  condition_expression,
  action_config,
  priority,
  is_active
) VALUES 
(
  'research-team-route-research',
  'research-team', 
  'Route Research Queries',
  'routing',
  'query.type === "research" OR query.content.includes("research") OR query.content.includes("analyze")',
  '{"primary_agent": "research-assistant", "secondary_agent": "conversation-manager", "mode": "sequential"}',
  1,
  true
),
(
  'development-team-route-coding', 
  'development-team',
  'Route Coding Queries',
  'routing', 
  'query.type === "coding" OR query.content.includes("code") OR query.content.includes("programming")',
  '{"primary_agent": "coding-assistant", "secondary_agent": "conversation-manager", "mode": "collaborative"}',
  1,
  true
),
(
  'analysis-team-complex-data',
  'analysis-team',
  'Handle Complex Analysis',
  'condition',
  'query.complexity > 0.7 AND (query.content.includes("analyze") OR query.content.includes("data"))',
  '{"mode": "parallel", "merge_strategy": "weighted", "require_consensus": false}',
  1, 
  true
),
(
  'full-stack-fallback',
  'full-stack-team',
  'Full Stack Fallback',
  'escalation',
  'previous_attempts > 2 OR query.complexity > 0.8',
  '{"mode": "adaptive", "max_agents": 3, "timeout": 300, "orchestration": "smalltalk"}',
  0,
  true
);

-- Display the created teams for verification
SELECT 
  t.name,
  t.description,
  GROUP_CONCAT(tm.agent_id || ' (' || tm.role || ')') as members,
  COUNT(tm.agent_id) as member_count
FROM agent_teams t
LEFT JOIN agent_team_members tm ON t.team_id = tm.team_id  
WHERE t.team_id IN ('research-team', 'development-team', 'analysis-team', 'full-stack-team')
GROUP BY t.team_id, t.name, t.description
ORDER BY t.name;