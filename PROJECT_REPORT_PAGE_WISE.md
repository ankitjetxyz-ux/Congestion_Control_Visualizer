<div style="color: white;">

# Congestion Control Visualizer
## Detailed Project Report (Page-Wise)

---

## Page 1: Title Page

**Project Title:** Congestion Control Visualizer: Real-Time Simulation of Congestion Dynamics and Attack Impact  
**Program:** Bachelor of Technology in Computer Science Engineering  
**Department:** Computer Science and Engineering (CSE)  
**Institute:** Institute of Technology, Nirma University  
**Academic Year:** 2025-26  
**Date:** March 2026

**Submitted by:**
1. Ankit Jethava (25BCE501)
2. Khushi Vora (25BCE534)

**Project Guide:** ____________________

---

## Page 2: Certificate / Declaration

This is to certify that the project titled **Congestion Control Visualizer** has been developed as a part of academic requirements for B.Tech CSE. The work presented is original and has been carried out by the undersigned students under institutional guidance.

We declare that:
1. The implementation and report are our own work.
2. External references and sources are acknowledged in the reference section.
3. This work has not been submitted previously for any other degree or evaluation.

---

## Page 3: Abstract

Congestion control is one of the most important concepts in computer networks, but it is often difficult for students to understand because packet behavior changes continuously over time. This project presents **Congestion Control Visualizer**, an interactive browser-based simulation tool that converts abstract congestion concepts into visible real-time behavior.

The system simulates packet transmission between source and destination over a constrained network medium. It models packet progression, delay, drop events, throughput, and congestion impact. It also introduces an attack-oriented **Chaos Lab**, where users can trigger stress events such as DDoS, Solar Flare, and Fiber Cut to observe instability, performance degradation, and recovery patterns.

The application is implemented using React, TypeScript, Vite, and custom CSS animation logic. It includes live metric cards, packet flow animation, trend plotting, environment presets, traffic-type controls, manual and autonomous chaos injection, and event logging. The simulator is educational, interactive, and suitable for classroom demonstrations, viva explanation, and lab learning.

---

## Page 4: Acknowledgement

We sincerely thank our faculty mentors and department for providing guidance, infrastructure, and encouragement throughout this project. We also acknowledge the foundational networking literature and RFC references that helped frame the congestion-control concepts used in this simulator.

---

## Page 5: Table of Contents

1. Introduction  
2. Problem Statement  
3. Objectives  
4. Scope  
5. System Architecture  
6. Data Model and State Design  
7. Core Simulation Algorithm  
8. Congestion Control and AIMD Behavior  
9. QoS and Traffic Classification  
10. Chaos Lab Design  
11. User Interface and Visualization  
12. Mathematical Model and Formulas  
13. Working Flow  
14. Experimental Scenarios and Observations  
15. Testing Strategy and Validation  
16. Advantages, Limitations, and Risks  
17. Future Scope  
18. Conclusion  
19. References

---

## Page 6: Introduction

In packet-switched networks, congestion occurs when offered traffic exceeds the network's handling capacity. The immediate effects are queue growth, increased delay, random loss, and eventual throughput collapse if overload persists.

While textbooks explain these behaviors mathematically, students often miss the time-varying interaction between sending rate, loss, and adaptation. This project addresses that gap using an interactive simulation where each packet is visualized and metrics update continuously.

The report documents both theoretical foundations and implementation choices used in the application.

---

## Page 7: Problem Statement

Traditional network labs often rely on static diagrams or command outputs. They rarely provide a live, intuitive representation of congestion evolution under varying conditions.

**Core problem:** learners need a practical visual system that demonstrates:
1. How packets move, queue, drop, and deliver.
2. How congestion and loss affect throughput and delay.
3. How adaptive congestion control responds to failures.
4. How abnormal events (attacks or disruptions) impact network reliability.

---

## Page 8: Objectives

The project objectives are:
1. Build a real-time packet-flow simulation with adjustable network parameters.
2. Implement congestion-sensitive behavior with an AIMD-inspired adaptation mechanism.
3. Provide interpretable telemetry: throughput, delay, drop rate, in-transit, delivered, and lost packets.
4. Introduce configurable traffic classes (voice, video, bulk data) to illustrate differential loss resistance.
5. Add stress-event modeling using a Chaos Lab for attack impact analysis.
6. Offer a responsive educational UI that supports fast experimentation.

---

## Page 9: Scope

### In Scope
1. Client-side simulation of packet transmission behavior.
2. Interactive controls for loss, congestion, speed, traffic, and environment presets.
3. Real-time visualization and metric tracking.
4. Event logging and attack-state display.

### Out of Scope
1. Full protocol-accurate TCP stack emulation.
2. Real packet capture or live traffic integration.
3. Multi-router routing protocols and path discovery.
4. Benchmark-grade scientific performance measurement.

---

## Page 10: Technology Stack

### Application Layer
1. React (functional component architecture)
2. TypeScript (typed state and behavior modeling)
3. Vite (fast development and bundling)

### Styling and Visualization
1. Custom CSS with gradients, glass panels, animations, and responsive breakpoints
2. SVG and div-based packet rendering
3. Dynamic charts built from live state history

### Toolchain
1. Node.js and npm
2. VS Code
3. Git and GitHub

---

## Page 11: High-Level System Architecture

The simulator follows a layered, event-driven architecture:

1. **Input Layer**: sliders, toggles, buttons, numeric input, preset cards.
2. **State Layer**: packet array, queue, telemetry counters, congestion window, event status.
3. **Simulation Engine**: fixed-interval tick loop updates packet progression and outcomes.
4. **Control Logic Layer**: applies AIMD and chaos overrides.
5. **Metrics and History Layer**: computes UI values and stores trend points.
6. **Presentation Layer**: renders channel animation, cards, charts, and logs.

**Data Flow:** User action -> State update -> Tick computation -> Metric derivation -> UI redraw.

---

## Page 12: Data Model and State Design

### Packet Model
Each packet stores:
1. unique id
2. progress (0 to 100)
3. status (active or lost)
4. loss time-to-live marker
5. dropProgress threshold
6. lane position (vertical spread)
7. speed variance
8. traffic type (voice, video, data)

### Global Runtime State
1. stats: throughput, delay, lossRate, congestion, sent, delivered
2. queuedPackets and packetTarget
3. lostTotal
4. cwnd and ssthresh
5. selected traffic profile and network profile
6. active tab and chaos mode flags
7. active chaos event and event log history

### Refs for Stable Simulation Loop
Mutable refs are used for high-frequency simulation values to avoid stale closures and interval jitter.

---

## Page 13: Core Simulation Algorithm

The simulation runs on repeated timed ticks.

### Tick Lifecycle
1. Read current stats and active event.
2. Derive effective loss, effective congestion, and jitter multiplier.
3. Inject queued packets subject to congestion window capacity.
4. Update each packet progression.
5. Mark packets lost or delivered based on thresholds.
6. Apply congestion-control updates.
7. Update counters and telemetry.

### Packet Injection Rule
Packets are injected while:
1. queue is non-zero, and
2. active packet count is less than floor(cwnd)

### Packet Outcome Rule
1. If packet reaches assigned dropProgress in loss zone, mark as lost.
2. If packet reaches destination progress >= 100, mark as delivered.
3. Otherwise keep packet active with updated progress.

Lost packets are displayed for a short TTL and then removed from render state.

---

## Page 14: Congestion Control and AIMD-Inspired Logic

The engine uses behavior inspired by TCP Reno:

1. **Slow Start / Growth:** successful delivery increases congestion window.
2. **Congestion Avoidance:** window growth becomes gentler at higher values.
3. **Multiplicative Decrease:** on drop event, threshold is halved and window reduced.

This creates an educational approximation of adaptive transmission under feedback.

---

## Page 15: QoS and Traffic Classification

The simulator supports three traffic classes:
1. Voice
2. Video
3. Bulk data

When mixed mode is selected, type is assigned probabilistically. Each type receives different resistance to effective drop probability:
1. Voice has highest resistance.
2. Video has moderate resistance.
3. Bulk data has baseline behavior.

This demonstrates service differentiation and priority influence on reliability.

---

## Page 16: Chaos Lab and Attack Modeling

The Chaos Lab is designed for controlled stress analysis.

### Attack Types
1. **DDoS:** forces congestion near saturation.
2. **Solar Flare:** amplifies jitter multiplier and causes unstable behavior.
3. **Fiber Cut:** imposes extreme loss conditions.

### Trigger Modes
1. Manual trigger buttons
2. Autonomous chaos mode (random attack injection)

### User-Controlled Stop
An active attack now remains in effect until user action stops it, either from:
1. top warning banner stop button, or
2. chaos tab stop button

### Event Log
Each activation/resolution is timestamped and shown in event history for post-analysis.

---

## Page 17: User Interface and Visualization Design

### Main UI Zones
1. Header with tab navigation and simulation speed badge
2. Full-width network channel visualization
3. Telemetry cards with key metrics
4. Trend graph for time-series behavior
5. Control panel for environment and traffic deployment
6. Chaos Lab and Event Log pages

### Visual Encoding
1. Different packet colors by traffic class
2. Lost packet marker animation
3. Attack badge and global alert banner during active threats
4. Dynamic status labels for congestion conditions

### Responsive Design
Layout adapts across desktop and mobile using CSS media queries and grid adjustments.

---

## Page 18: Mathematical Model and Formulas

The implementation uses simplified deterministic and probabilistic equations.

### Input Conversion
$p_{loss} = \frac{lossRate}{100}$

### Simulation Tick
$dt_{ms} = \frac{100}{speed}$

### Packet Progress
$\Delta progress = \left(0.8 + \frac{congestion}{100}\right) \cdot speed_{effective}$

$progress_{new} = progress_{old} + \Delta progress$

### Queue Updates
$queued_{new} = queued_{old} + packetTarget$

$queued_{new} = \max(0, queued_{old} - 1)$

### Observed Drop Rate
$$
dropRate(\%) =
\begin{cases}
\frac{lostTotal}{sent} \cdot 100, & sent > 0 \\
0, & sent = 0
\end{cases}
$$

### Delay and Throughput (UI Approximation)
Throughput and delay are computed as functions of active packets, queue pressure, speed, and congestion, providing relative trend behavior for educational analysis.

---

## Page 19: Working Flow

1. User selects an environment preset or custom settings.
2. User chooses traffic type and deploys packet batch.
3. Packets enter queue and are released under congestion-window limits.
4. Simulation tick updates packet trajectories and state transitions.
5. Telemetry cards and trend chart refresh continuously.
6. User injects attack event manually or enables autonomous chaos mode.
7. Active attack remains until user stops it.
8. Event history records emergency and resolved states.
9. User pauses, resumes, or resets simulation for new scenario.

---

## Page 20: Experimental Scenarios and Expected Observations

### Scenario 1: Low Congestion, Low Loss
1. Smooth packet delivery
2. Lower delay
3. Stable throughput growth

### Scenario 2: High Congestion, Moderate Loss
1. Increased drop rate
2. Delay spike
3. Fluctuating throughput

### Scenario 3: DDoS Active
1. Congestion saturation behavior
2. Throughput reduction
3. Slow recovery after attack stop

### Scenario 4: Solar Flare Active
1. High jitter and packet speed variance
2. Irregular delivery intervals
3. Unstable metric graph

### Scenario 5: Fiber Cut Active
1. Severe loss
2. Minimal useful delivery
3. Throughput collapse until attack is stopped

---

## Page 21: Testing Strategy and Validation

### Functional Testing
1. Packet deployment and queue decrement
2. Play/pause/reset behavior
3. Profile selection updates parameters
4. Manual attack trigger and stop controls
5. Autonomous chaos mode trigger behavior
6. Event log timestamp entries

### Logic Validation
1. Packet states transition correctly (active to lost or delivered)
2. AIMD-like cwnd response on drops and deliveries
3. Drop-rate formula matches counters
4. History slice length is bounded and chart path generation remains stable

### UI Validation
1. Metric cards update without layout break
2. Attack banner visibility reflects active state
3. Mobile layout remains readable

---

## Page 22: Advantages, Limitations, and Risks

### Advantages
1. Strong conceptual clarity through animation and live feedback
2. Easy parameter experimentation for classroom and viva
3. Stress testing via chaos events improves comparative understanding
4. Lightweight browser-based setup with no backend dependency

### Limitations
1. Simplified model, not complete transport stack emulation
2. Single-link abstraction, no dynamic routing or multi-hop queues
3. Statistical behavior depends on randomization and therefore varies per run

### Risks and Mitigations
1. Misinterpretation as real-world benchmark: mitigated by clearly labeling as educational simulator.
2. Visual overload for beginners: mitigated via panel grouping and clear metric labels.

---

## Page 23: Future Scope

1. Add multi-hop topology with router queue visualization.
2. Add selectable TCP variants (Tahoe, Reno, CUBIC, BBR) for side-by-side comparison.
3. Add export of trend data and scenario summaries as CSV/PDF.
4. Introduce guided lab mode with predefined experiments and expected outcomes.
5. Add backend persistence for saved sessions and comparative runs.
6. Add confidence intervals and repeated-trial averaging for stronger analytical output.

---

## Page 24: Conclusion

The Congestion Control Visualizer successfully transforms congestion-control theory into an interactive learning experience. By combining packet-level animation, adaptive window control, traffic prioritization, real-time telemetry, and chaos-event modeling, the tool helps learners understand how modern networks behave under normal load and abnormal stress.

The project demonstrates practical frontend engineering, real-time state management, and educational visualization design. It is suitable for demonstrations, viva explanations, and conceptual labs in computer networks.

---

## Page 25: References

1. RFC 5681: TCP Congestion Control.
2. James F. Kurose and Keith W. Ross, Computer Networking: A Top-Down Approach.
3. Andrew S. Tanenbaum and David J. Wetherall, Computer Networks.
4. React Documentation.
5. TypeScript Handbook.

---

## Appendix A: Quick Viva Pointers

1. Why this project: to make dynamic congestion behavior visible.
2. Core mechanism: timed simulation loop plus AIMD-like adaptation.
3. Unique part: Chaos Lab with user-controlled persistent attacks.
4. Educational value: immediate mapping from parameter change to network effect.
5. Limitation statement: conceptual simulator, not wire-level protocol implementation.

</div>
