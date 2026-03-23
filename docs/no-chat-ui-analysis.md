# Why We Don't Build a Custom Chat UI

> Analysis of the decision to focus on Zotero CLI + CCP Protocol instead of building a dedicated Chat UI.

## Executive Summary

After careful analysis, we decided **not to build a custom Chat UI**. Instead, we focus on:

1. **Zotero CLI** - Tool Calling integration for any LLM client
2. **CCP Protocol** - Universal clipboard-based context exchange

This decision reduces development effort while maximizing compatibility with existing AI clients.

---

## The Original Plan

```
┌─────────────────────────────────────────────────────────────┐
│                    Original Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Zotero CLI  │    │ CCP Protocol│    │   Chat UI   │     │
│  │ (Tool Call) │    │ (Clipboard) │    │  (Electron) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                   │           │
│         ▼                  ▼                   ▼           │
│    LLM Integration      Context Injection      User Interface  │
│                                                             │
│  Problem: High development effort, reinventing the wheel    │
└─────────────────────────────────────────────────────────────┘
```

## Why Not Build Chat UI

### 1. Existing AI Clients Are Mature

| Client | Tool Calling | CCP Support (Potential) | Best For |
|--------|-------------|------------------------|----------|
| **Cherry Studio** | ✅ Full support | Plugin possible | Local multi-model |
| **Cursor** | ✅ Full support | Extension possible | Code-centric workflows |
| **Claude Desktop** | ✅ Full support | Native integration possible | General conversation |
| **Codex / OpenCode** | ✅ Full support | Open for customization | Open-source flexibility |
| **ChatGPT** | ✅ Full support | Browser extension possible | General conversation |
| **Windsurf** | ✅ Full support | IDE integration | Development workflows |

**Key insight**: Building a Chat UI means competing with well-established products that have:
- Better UI/UX
- More features
- Larger teams
- More resources

### 2. CCP Protocol's Design Goal

```
CCP Design Philosophy:

Any Application ──Copy──▶ Clipboard ──Paste──▶ Any AI Client

Building a custom Chat UI contradicts this "universal protocol" goal.
```

The CCP protocol is designed to be **client-agnostic**. If we build our own Chat UI, we:
- Create a proprietary solution
- Reduce incentive for other clients to adopt CCP
- Duplicate effort that could go into improving the protocol

### 3. Effort Analysis

| Component | Estimated Effort | Value |
|-----------|-----------------|-------|
| Zotero CLI (7 commands) | ~2-3 weeks | High (core functionality) |
| CCP Protocol spec | ~1 week | High (enables ecosystem) |
| CCP Producer (Zotero plugin) | ~1-2 weeks | High (real-world usage) |
| CCP Consumer (client plugins) | ~2-4 weeks each | Medium (per-client) |
| **Custom Chat UI** | **~8-12 weeks** | **Low (existing alternatives)** |

**Total with Chat UI**: 14-22 weeks
**Total without Chat UI**: 6-10 weeks

### 4. User Freedom

By not building a Chat UI, users can:
- Choose their preferred AI client
- Switch clients without losing Zotero integration
- Use different clients for different workflows
- Benefit from each client's unique features

---

## The Simplified Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Simplified Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │ Zotero CLI  │    │ CCP Protocol│                        │
│  │ (Tool Call) │    │ (Open Std)  │                        │
│  └─────────────┘    └─────────────┘                        │
│         │                  │                               │
│         ▼                  ▼                               │
│   Configure to       Configure to                          │
│   existing clients   existing clients                       │
│   (Cherry/Cursor)    (Cherry/Cursor)                        │
│                                                             │
│  Advantages:                                                │
│  • Focus on core functionality (CLI + Protocol)             │
│  • Leverage mature AI clients                               │
│  • Users choose their preferred client                      │
│  • Significantly reduced development effort                 │
└─────────────────────────────────────────────────────────────┘
```

---

## When Would a Custom Chat UI Make Sense?

| Scenario | Need Custom UI? | Reason |
|----------|-----------------|--------|
| General AI conversation | ❌ No | Cherry/Claude already excellent |
| Zotero-specific interactions | ⚠️ Maybe | Consider Zotero plugin instead |
| Special workflow automation | ⚠️ Maybe | Depends on how niche the workflow is |
| Commercial product offering | ✅ Yes | Need owned product for business |
| Enterprise deployment | ⚠️ Maybe | May need control/security features |

---

## Revised Roadmap

### Phase 1: Core (Current Focus)
```
├── Zotero CLI (Tool Calling)
│   ├── zotero search
│   ├── zotero get
│   ├── zotero pdf
│   ├── zotero collections
│   ├── zotero tags
│   ├── zotero annotations
│   └── zotero recent
│
└── CCP Protocol Specification
    └── Document + examples
```

### Phase 2: Ecosystem
```
├── CCP Producers
│   ├── Zotero plugin (copy with context)
│   └── Browser extension
│
└── CCP Consumers
    ├── Cherry Studio plugin
    ├── Claude Desktop extension
    └── Generic JavaScript SDK
```

### Phase 3: Advanced (Optional)
```
├── Zotero Plugin Enhancements
│   ├── Quick actions
│   └── Context menu integration
│
└── Custom Chat UI (Only if explicitly needed)
    └── Evaluate based on user feedback
```

---

## Conclusion

**Decision**: Do not build a custom Chat UI.

**Rationale**:
1. Existing AI clients are mature and feature-rich
2. CCP protocol is designed for universal compatibility
3. Development effort is better spent on core functionality
4. Users benefit from choice and flexibility

**Next Steps**:
1. Complete Zotero CLI implementation
2. Finalize CCP protocol specification
3. Build CCP producer (Zotero plugin)
4. Create CCP consumer SDKs for popular clients

---

## Appendix: Removed Code

The following Electron-based Chat UI code was removed from this repository:

- `src/chatui/` - Electron application source
- `src/modules/vibeResearch.ts` - Electron launcher module
- `addon/vibe-research/` - Bundled Electron binaries
- Related npm scripts in `package.json`

The documentation remains available for reference:
- `docs/zotero-cli-technical-roadmap.md`
- `docs/clipboard-context-protocol.md`
