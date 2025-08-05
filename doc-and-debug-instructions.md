# Doc and Debug Command - Universal Project Analysis & Debugging System

## Overview
This instruction set enables a comprehensive "doc and debug" workflow for any project. It creates structured documentation, detects issues, and provides systematic debugging with progress tracking and resumption capabilities.

## Command Trigger
When user says "doc and debug" or "run doc and debug", execute this complete workflow.

## Phase 1: Project Analysis & Setup

### 1.1 Initial Project Scan
- **Scan the entire project structure** using `list_dir` and `file_search`
- **Identify key files**: package.json, requirements.txt, pom.xml, build.gradle, etc.
- **Detect project type**: React, Node.js, Python, Java, etc.
- **Analyze dependencies** and configuration files
- **Create project summary** with tech stack and architecture

### 1.2 Create Plan Folder Structure
Create a `.doc-debug` folder in the project root with this structure:
```
.doc-debug/
├── main-plan.md          # Overall project plan and objectives
├── progress.md           # Current status and next steps
├── history.md            # Timeline of all actions taken
├── errors/               # Error-specific investigation plans
│   └── README.md         # Error tracking index
├── fixes/                # Completed fixes and solutions
│   └── README.md         # Fix tracking index
├── docs/                 # Generated documentation
│   ├── project-overview.md
│   ├── architecture.md
│   ├── setup-guide.md
│   └── troubleshooting.md
└── analysis/             # Project analysis results
    ├── dependencies.md
    ├── structure.md
    └── quality-report.md
```

### 1.3 Initialize Main Plan
Create `main-plan.md` with:
- Project overview and objectives
- Current state assessment
- Planned documentation deliverables
- Error detection strategy
- Success criteria
- Timeline estimates

## Phase 2: Documentation Generation

### 2.1 Project Overview Documentation
- **Generate comprehensive README.md** with:
  - Project description and purpose
  - Tech stack and dependencies
  - Installation and setup instructions
  - Usage examples
  - Contributing guidelines
  - License information

### 2.2 Architecture Documentation
- **Create architecture.md** with:
  - System architecture diagram (text-based)
  - Component relationships
  - Data flow descriptions
  - Key design decisions
  - Scalability considerations

### 2.3 Code Documentation
- **Analyze source code** for:
  - Function and class documentation
  - API endpoints and interfaces
  - Configuration options
  - Environment variables
  - Database schemas

### 2.4 Setup and Deployment Guides
- **Create setup-guide.md** with:
  - Development environment setup
  - Build and deployment processes
  - Environment configuration
  - Testing procedures
  - Troubleshooting common issues

## Phase 3: Error Detection & Analysis

### 3.1 Systematic Error Detection
- **Run project analysis** using available tools:
  - Code quality assessment
  - Dependency vulnerability scanning
  - Performance analysis
  - Security review
  - Compatibility checks

### 3.2 Error Categorization
Categorize detected issues into:
- **Critical**: Blocking functionality or security issues
- **High**: Performance or reliability problems
- **Medium**: Code quality or maintainability issues
- **Low**: Minor improvements or optimizations

### 3.3 Error Plan Creation
For each detected error:
- **Create individual plan file** in `errors/` folder
- **Name format**: `error-{category}-{description}.md`
- **Include**: Error description, impact assessment, investigation steps, proposed solutions, testing approach

## Phase 4: Debugging Workflow

### 4.1 Error Investigation Process
For each error plan:
- **Deep dive analysis** of the specific issue
- **Root cause identification**
- **Solution research** using available tools
- **Implementation planning**
- **Testing strategy development**

### 4.2 Fix Implementation
- **Implement the fix** with proper code changes
- **Document the solution** in the error plan
- **Move completed fix** to `fixes/` folder
- **Update progress.md** with completion status
- **Add to history.md** with timestamp and details

### 4.3 Validation & Testing
- **Test the implemented fix**
- **Verify no regressions** introduced
- **Update documentation** if needed
- **Mark error as resolved** in tracking

## Phase 5: Progress Tracking & Resumption

### 5.1 Progress Management
- **Update progress.md** after each major step
- **Track completion percentages** for each phase
- **List next immediate actions**
- **Note any blockers or dependencies**

### 5.2 History Tracking
- **Maintain detailed history.md** with:
  - Timestamp of each action
  - Description of what was done
  - Files modified or created
  - Decisions made and rationale
  - Time spent on each task

### 5.3 Resumption Logic
When resuming work:
- **Read progress.md** to understand current state
- **Review history.md** for recent actions
- **Check for any incomplete error plans**
- **Continue from the last incomplete step**
- **Update progress immediately upon resumption**

## Phase 6: Quality Assurance & Finalization

### 6.1 Documentation Review
- **Verify all documentation is complete**
- **Check for accuracy and consistency**
- **Ensure all links and references work**
- **Validate setup instructions**

### 6.2 Code Quality Final Check
- **Run final code analysis**
- **Verify all fixes are properly implemented**
- **Check for any remaining issues**
- **Ensure no new problems were introduced**

### 6.3 Project Handover Preparation
- **Create final summary report**
- **Document any remaining known issues**
- **Provide recommendations for future improvements**
- **Create maintenance guidelines**

## File Templates

### main-plan.md Template
```markdown
# Project Documentation & Debug Plan

## Project Overview
- **Name**: [Project Name]
- **Type**: [Project Type]
- **Tech Stack**: [List of technologies]
- **Current State**: [Assessment]

## Objectives
1. [Objective 1]
2. [Objective 2]
3. [Objective 3]

## Documentation Deliverables
- [ ] Project README
- [ ] Architecture documentation
- [ ] Setup guide
- [ ] API documentation
- [ ] Troubleshooting guide

## Error Detection Strategy
- [ ] Code quality analysis
- [ ] Security review
- [ ] Performance assessment
- [ ] Dependency audit

## Success Criteria
- [ ] All documentation complete
- [ ] All critical errors resolved
- [ ] Project builds and runs successfully
- [ ] Setup instructions verified

## Timeline
- Phase 1: [Estimated time]
- Phase 2: [Estimated time]
- Phase 3: [Estimated time]
- Phase 4: [Estimated time]
- Phase 5: [Estimated time]
- Phase 6: [Estimated time]

## Current Status
[Updated after each phase]
```

### progress.md Template
```markdown
# Progress Tracking

## Overall Progress: [X]%

### Phase 1: Project Analysis & Setup
- [ ] Initial project scan
- [ ] Plan folder structure created
- [ ] Main plan initialized
**Status**: [Complete/In Progress/Blocked]

### Phase 2: Documentation Generation
- [ ] Project overview documentation
- [ ] Architecture documentation
- [ ] Code documentation
- [ ] Setup and deployment guides
**Status**: [Complete/In Progress/Blocked]

### Phase 3: Error Detection & Analysis
- [ ] Systematic error detection
- [ ] Error categorization
- [ ] Error plan creation
**Status**: [Complete/In Progress/Blocked]

### Phase 4: Debugging Workflow
- [ ] Error investigation process
- [ ] Fix implementation
- [ ] Validation & testing
**Status**: [Complete/In Progress/Blocked]

### Phase 5: Progress Tracking & Resumption
- [ ] Progress management
- [ ] History tracking
- [ ] Resumption logic
**Status**: [Complete/In Progress/Blocked]

### Phase 6: Quality Assurance & Finalization
- [ ] Documentation review
- [ ] Code quality final check
- [ ] Project handover preparation
**Status**: [Complete/In Progress/Blocked]

## Next Immediate Actions
1. [Action 1]
2. [Action 2]
3. [Action 3]

## Blockers
- [List any blockers or dependencies]

## Last Updated
[Timestamp]
```

### Error Plan Template
```markdown
# Error: [Error Title]

## Category
[Critical/High/Medium/Low]

## Description
[Detailed description of the error]

## Impact Assessment
- **Severity**: [High/Medium/Low]
- **Affected Components**: [List components]
- **User Impact**: [How it affects users]
- **Business Impact**: [How it affects business]

## Investigation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Root Cause
[Identified root cause]

## Proposed Solutions
1. **Solution 1**: [Description]
   - Pros: [List pros]
   - Cons: [List cons]
   - Implementation time: [Estimate]

2. **Solution 2**: [Description]
   - Pros: [List pros]
   - Cons: [List cons]
   - Implementation time: [Estimate]

## Selected Solution
[Which solution was chosen and why]

## Implementation
[Details of the implementation]

## Testing
- [ ] Unit tests written
- [ ] Integration tests updated
- [ ] Manual testing completed
- [ ] No regressions introduced

## Status
[Open/In Progress/Resolved/Closed]

## Created
[Timestamp]

## Resolved
[Timestamp]
```

## Usage Instructions

### For New Projects
1. Say "doc and debug" to trigger the complete workflow
2. The system will automatically:
   - Analyze the project structure
   - Create the plan folder structure
   - Generate comprehensive documentation
   - Detect and categorize errors
   - Implement systematic fixes
   - Track all progress

### For Existing Projects
1. Say "doc and debug" to resume or continue
2. The system will:
   - Read existing progress.md
   - Continue from the last incomplete step
   - Update progress as work continues
   - Maintain history of all actions

### For Specific Issues
1. Say "doc and debug [specific issue]" to focus on a particular problem
2. The system will:
   - Create a focused error plan
   - Investigate the specific issue
   - Implement targeted fixes
   - Update the main plan accordingly

## Success Metrics
- **Documentation Coverage**: 100% of project components documented
- **Error Resolution**: All critical and high-priority errors resolved
- **Code Quality**: Improved code quality scores
- **Setup Success**: New developers can successfully set up and run the project
- **Maintenance**: Clear guidelines for ongoing maintenance

## Notes
- Always use sequential thinking for complex problem-solving
- Leverage available tools (Gemini, DeepLake-RAG, etc.) for research and analysis
- Maintain detailed history for audit trails and learning
- Update progress immediately after each action
- Create focused plans for each error to prevent scope creep
- Use consistent file naming and folder structure across all projects 