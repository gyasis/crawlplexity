-- Seed workflow templates for the template gallery
-- This script creates common workflow templates that users can instantiate

-- Research & Analysis Template
INSERT INTO workflow_templates (
  template_id, name, description, category,
  definition, complexity_level, estimated_nodes, orchestration_type
) VALUES (
  'template-research-analysis-001',
  'Research & Analysis Pipeline',
  'Comprehensive research workflow that searches, analyzes, and summarizes information on any topic',
  'research',
  '{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Research Query","config":{"inputType":"text","placeholder":"Enter research topic..."}}},{"id":"agent-research","type":"agent","position":{"x":50,"y":100},"data":{"label":"Research Agent","agentMode":"agentic","config":{"role":"researcher","expertise":["web_search","data_analysis","fact_checking"]}}},{"id":"agent-analyzer","type":"agent","position":{"x":50,"y":200},"data":{"label":"Analysis Agent","agentMode":"agent","config":{"role":"analyst","expertise":["critical_thinking","synthesis","reporting"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":300},"data":{"label":"Research Report","config":{"format":"markdown","sections":["summary","key_findings","sources","recommendations"]}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-research"},{"id":"conn-2","source":"agent-research","target":"agent-analyzer"},{"id":"conn-3","source":"agent-analyzer","target":"output-1"}],"settings":{"orchestrationMode":"auto","timeout":600000}}',
  'beginner', 4, 'agentic'
);

-- Content Creation Template
INSERT INTO workflow_templates (
  template_id, name, description, category,
  definition, complexity_level, estimated_nodes, orchestration_type
) VALUES (
  'template-content-creation-002',
  'Content Creation Workflow',
  'Generate high-quality content with research, writing, and review phases',
  'content',
  '{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Content Brief","config":{"inputType":"object","fields":["topic","audience","tone","length"]}}},{"id":"agent-researcher","type":"agent","position":{"x":50,"y":100},"data":{"label":"Research Specialist","agentMode":"agentic","config":{"role":"content_researcher","expertise":["topic_research","audience_analysis","competitive_analysis"]}}},{"id":"agent-writer","type":"agent","position":{"x":50,"y":200},"data":{"label":"Content Writer","agentMode":"agent","config":{"role":"copywriter","expertise":["creative_writing","seo_optimization","brand_voice"]}}},{"id":"agent-editor","type":"agent","position":{"x":50,"y":300},"data":{"label":"Editor","agentMode":"agent","config":{"role":"editor","expertise":["proofreading","fact_checking","style_guide"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":400},"data":{"label":"Final Content","config":{"format":"markdown","metadata":["word_count","readability_score","seo_keywords"]}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-researcher"},{"id":"conn-2","source":"agent-researcher","target":"agent-writer"},{"id":"conn-3","source":"agent-writer","target":"agent-editor"},{"id":"conn-4","source":"agent-editor","target":"output-1"}],"settings":{"orchestrationMode":"hybrid","timeout":900000}}',
  'intermediate', 5, 'hybrid'
);

-- Customer Support Template
INSERT INTO workflow_templates (
  template_id, name, description, category,
  definition, complexity_level, estimated_nodes, orchestration_type
) VALUES (
  'template-customer-support-003',
  'Customer Support Assistant',
  'Intelligent customer support workflow with triage, resolution, and escalation',
  'support',
  '{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Customer Inquiry","config":{"inputType":"object","fields":["message","customer_id","priority","category"]}}},{"id":"agent-triage","type":"agent","position":{"x":50,"y":100},"data":{"label":"Triage Agent","agentMode":"agent","config":{"role":"support_triage","expertise":["issue_classification","priority_assessment","routing"]}}},{"id":"agent-support","type":"agent","position":{"x":50,"y":200},"data":{"label":"Support Agent","agentMode":"agentic","config":{"role":"support_agent","expertise":["general_support","troubleshooting","customer_service"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":300},"data":{"label":"Support Response","config":{"format":"structured","fields":["response","resolution_status","follow_up_needed"]}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-triage"},{"id":"conn-2","source":"agent-triage","target":"agent-support"},{"id":"conn-3","source":"agent-support","target":"output-1"}],"settings":{"orchestrationMode":"auto","timeout":300000}}',
  'intermediate', 4, 'hybrid'
);

-- Data Processing Template
INSERT INTO workflow_templates (
  template_id, name, description, category,
  definition, complexity_level, estimated_nodes, orchestration_type
) VALUES (
  'template-data-processing-004',
  'Data Processing Pipeline',
  'Automated data ingestion, cleaning, analysis, and reporting workflow',
  'data',
  '{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Data Input","config":{"inputType":"object","fields":["data_source","format","processing_type"]}}},{"id":"agent-validator","type":"agent","position":{"x":50,"y":100},"data":{"label":"Data Validator","agentMode":"agent","config":{"role":"data_validator","expertise":["data_quality","schema_validation","error_detection"]}}},{"id":"agent-cleaner","type":"agent","position":{"x":50,"y":200},"data":{"label":"Data Cleaner","agentMode":"agent","config":{"role":"data_cleaner","expertise":["data_cleaning","normalization","deduplication"]}}},{"id":"agent-analyzer","type":"agent","position":{"x":50,"y":300},"data":{"label":"Data Analyst","agentMode":"agentic","config":{"role":"data_analyst","expertise":["statistical_analysis","pattern_recognition","insights_generation"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":400},"data":{"label":"Analysis Report","config":{"format":"structured","sections":["data_summary","key_insights","visualizations","recommendations"]}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-validator"},{"id":"conn-2","source":"agent-validator","target":"agent-cleaner"},{"id":"conn-3","source":"agent-cleaner","target":"agent-analyzer"},{"id":"conn-4","source":"agent-analyzer","target":"output-1"}],"settings":{"orchestrationMode":"auto","timeout":1200000}}',
  'advanced', 5, 'agent'
);

-- Quick Q&A Template
INSERT INTO workflow_templates (
  template_id, name, description, category,
  definition, complexity_level, estimated_nodes, orchestration_type
) VALUES (
  'template-quick-qa-005',
  'Quick Q&A Assistant',
  'Simple question-answering workflow for fast responses',
  'general',
  '{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Question","config":{"inputType":"text","placeholder":"Ask your question..."}}},{"id":"agent-qa","type":"agent","position":{"x":50,"y":100},"data":{"label":"Q&A Agent","agentMode":"agentic","config":{"role":"assistant","expertise":["general_knowledge","problem_solving","explanations"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":200},"data":{"label":"Answer","config":{"format":"text","include_sources":true}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-qa"},{"id":"conn-2","source":"agent-qa","target":"output-1"}],"settings":{"orchestrationMode":"auto","timeout":60000}}',
  'beginner', 3, 'agentic'
);