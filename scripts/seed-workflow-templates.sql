-- Seed workflow templates for the template gallery
-- This script creates common workflow templates that users can instantiate

-- Research & Analysis Template
INSERT INTO workflow_templates (
  template_id, name, description, category,
  definition, complexity_level, estimated_nodes, orchestration_type
) VALUES (
  'template-research-analysis-' || strftime('%s', 'now'),
  'Research & Analysis Pipeline',
  'Comprehensive research workflow that searches, analyzes, and summarizes information on any topic',
  'research',
  'analysis',
  json('{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Research Query","config":{"inputType":"text","placeholder":"Enter research topic..."}}},{"id":"agent-research","type":"agent","position":{"x":50,"y":100},"data":{"label":"Research Agent","agentMode":"agentic","config":{"role":"researcher","expertise":["web_search","data_analysis","fact_checking"]}}},{"id":"agent-analyzer","type":"agent","position":{"x":50,"y":200},"data":{"label":"Analysis Agent","agentMode":"agent","config":{"role":"analyst","expertise":["critical_thinking","synthesis","reporting"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":300},"data":{"label":"Research Report","config":{"format":"markdown","sections":["summary","key_findings","sources","recommendations"]}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-research"},{"id":"conn-2","source":"agent-research","target":"agent-analyzer"},{"id":"conn-3","source":"agent-analyzer","target":"output-1"}],"settings":{"orchestrationMode":"auto","timeout":600000}}'),
  json('{"zoom":1,"viewport":{"x":0,"y":0}}'),
  json('["research","analysis","automation","reporting"]'),
  0, 5.0, 'system', 1, 1, 'beginner', 4, 'agentic'
),

-- Content Creation Template
(
  'template-content-creation-' || strftime('%s', 'now'),
  'Content Creation Workflow',
  'Generate high-quality content with research, writing, and review phases',
  'content',
  'writing',
  json('{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Content Brief","config":{"inputType":"object","fields":["topic","audience","tone","length"]}}},{"id":"agent-researcher","type":"agent","position":{"x":50,"y":100},"data":{"label":"Research Specialist","agentMode":"agentic","config":{"role":"content_researcher","expertise":["topic_research","audience_analysis","competitive_analysis"]}}},{"id":"agent-writer","type":"agent","position":{"x":50,"y":200},"data":{"label":"Content Writer","agentMode":"agent","config":{"role":"copywriter","expertise":["creative_writing","seo_optimization","brand_voice"]}}},{"id":"agent-editor","type":"agent","position":{"x":50,"y":300},"data":{"label":"Editor","agentMode":"agent","config":{"role":"editor","expertise":["proofreading","fact_checking","style_guide"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":400},"data":{"label":"Final Content","config":{"format":"markdown","metadata":["word_count","readability_score","seo_keywords"]}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-researcher"},{"id":"conn-2","source":"agent-researcher","target":"agent-writer"},{"id":"conn-3","source":"agent-writer","target":"agent-editor"},{"id":"conn-4","source":"agent-editor","target":"output-1"}],"settings":{"orchestrationMode":"hybrid","timeout":900000}}'),
  json('{"zoom":1,"viewport":{"x":0,"y":0}}'),
  json('["content","writing","marketing","automation"]'),
  0, 4.8, 'system', 1, 1, 'intermediate', 5, 'hybrid'
),

-- Customer Support Template
(
  'template-customer-support-' || strftime('%s', 'now'),
  'Customer Support Assistant',
  'Intelligent customer support workflow with triage, resolution, and escalation',
  'support',
  'customer_service',
  json('{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Customer Inquiry","config":{"inputType":"object","fields":["message","customer_id","priority","category"]}}},{"id":"agent-triage","type":"agent","position":{"x":50,"y":100},"data":{"label":"Triage Agent","agentMode":"agent","config":{"role":"support_triage","expertise":["issue_classification","priority_assessment","routing"]}}},{"id":"condition-1","type":"condition","position":{"x":50,"y":200},"data":{"label":"Complexity Check","config":{"condition":"context.priority === 'high' || context.complexity === 'advanced'"}}},{"id":"agent-specialist","type":"agent","position":{"x":150,"y":300},"data":{"label":"Specialist Agent","agentMode":"agentic","config":{"role":"support_specialist","expertise":["technical_support","advanced_troubleshooting","escalation"]}}},{"id":"agent-general","type":"agent","position":{"x":-50,"y":300},"data":{"label":"General Support","agentMode":"agent","config":{"role":"support_agent","expertise":["general_support","faq","basic_troubleshooting"]}}},{"id":"merger-1","type":"merger","position":{"x":50,"y":400},"data":{"label":"Response Merger","config":{"strategy":"select_best"}}},{"id":"output-1","type":"output","position":{"x":50,"y":500},"data":{"label":"Support Response","config":{"format":"structured","fields":["response","resolution_status","follow_up_needed","satisfaction_survey"]}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-triage"},{"id":"conn-2","source":"agent-triage","target":"condition-1"},{"id":"conn-3","source":"condition-1","target":"agent-specialist","data":{"condition":"high_complexity"}},{"id":"conn-4","source":"condition-1","target":"agent-general","data":{"condition":"low_complexity"}},{"id":"conn-5","source":"agent-specialist","target":"merger-1"},{"id":"conn-6","source":"agent-general","target":"merger-1"},{"id":"conn-7","source":"merger-1","target":"output-1"}],"settings":{"orchestrationMode":"manual","orchestrationConfig":{"strategy":"conditional","rules":[{"id":"rule-1","type":"routing","conditionExpression":"priority === \'high\'","action":{"type":"route_to_agent","target":"agent-specialist"}}]}}}'),
  json('{"zoom":0.8,"viewport":{"x":0,"y":0}}'),
  json('["support","customer_service","automation","triage"]'),
  0, 4.5, 'system', 1, 0, 'advanced', 7, 'hybrid'
),

-- Data Processing Template
(
  'template-data-processing-' || strftime('%s', 'now'),
  'Data Processing Pipeline',
  'Automated data ingestion, cleaning, analysis, and reporting workflow',
  'data',
  'processing',
  json('{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Data Input","config":{"inputType":"object","fields":["data_source","format","processing_type"]}}},{"id":"agent-validator","type":"agent","position":{"x":50,"y":100},"data":{"label":"Data Validator","agentMode":"agent","config":{"role":"data_validator","expertise":["data_quality","schema_validation","error_detection"]}}},{"id":"agent-cleaner","type":"agent","position":{"x":50,"y":200},"data":{"label":"Data Cleaner","agentMode":"agent","config":{"role":"data_cleaner","expertise":["data_cleaning","normalization","deduplication"]}}},{"id":"agent-analyzer","type":"agent","position":{"x":50,"y":300},"data":{"label":"Data Analyst","agentMode":"agentic","config":{"role":"data_analyst","expertise":["statistical_analysis","pattern_recognition","insights_generation"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":400},"data":{"label":"Analysis Report","config":{"format":"structured","sections":["data_summary","key_insights","visualizations","recommendations"]}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-validator"},{"id":"conn-2","source":"agent-validator","target":"agent-cleaner"},{"id":"conn-3","source":"agent-cleaner","target":"agent-analyzer"},{"id":"conn-4","source":"agent-analyzer","target":"output-1"}],"settings":{"orchestrationMode":"auto","timeout":1200000}}'),
  json('{"zoom":1,"viewport":{"x":0,"y":0}}'),
  json('["data","processing","analysis","automation"]'),
  0, 4.2, 'system', 1, 0, 'intermediate', 5, 'agent'
),

-- Quick Q&A Template
(
  'template-quick-qa-' || strftime('%s', 'now'),
  'Quick Q&A Assistant',
  'Simple question-answering workflow for fast responses',
  'general',
  'qa',
  json('{"nodes":[{"id":"trigger-1","type":"trigger","position":{"x":50,"y":0},"data":{"label":"Question","config":{"inputType":"text","placeholder":"Ask your question..."}}},{"id":"agent-qa","type":"agent","position":{"x":50,"y":100},"data":{"label":"Q&A Agent","agentMode":"agentic","config":{"role":"assistant","expertise":["general_knowledge","problem_solving","explanations"]}}},{"id":"output-1","type":"output","position":{"x":50,"y":200},"data":{"label":"Answer","config":{"format":"text","include_sources":true}}}],"connections":[{"id":"conn-1","source":"trigger-1","target":"agent-qa"},{"id":"conn-2","source":"agent-qa","target":"output-1"}],"settings":{"orchestrationMode":"auto","timeout":60000}}'),
  json('{"zoom":1,"viewport":{"x":0,"y":0}}'),
  json('["qa","simple","quick","general"]'),
  0, 4.0, 'system', 1, 0, 'beginner', 3, 'agentic'
);

-- Update template usage statistics (simulate some usage)
UPDATE workflow_templates SET usage_count = 25, rating = 4.8 WHERE name = 'Research & Analysis Pipeline';
UPDATE workflow_templates SET usage_count = 18, rating = 4.6 WHERE name = 'Content Creation Workflow';
UPDATE workflow_templates SET usage_count = 12, rating = 4.3 WHERE name = 'Customer Support Assistant';
UPDATE workflow_templates SET usage_count = 8, rating = 4.1 WHERE name = 'Data Processing Pipeline';
UPDATE workflow_templates SET usage_count = 35, rating = 4.9 WHERE name = 'Quick Q&A Assistant';