# Congestion Control Simulator Formulas (Used In This Project)

Only formulas currently used in the app are listed below.
Random-value formulas are intentionally excluded.

## 1) Input Conversion

### 1.1 Loss Probability From Slider

\[
p_{loss} = \frac{lossRate}{100}
\]

## 2) Time Step

### 2.1 Simulation Tick Interval

\[
dt_{ms} = \frac{100}{speed}
\]

## 3) Packet Movement

### 3.1 Progress Increment

\[
\Delta progress = \left(0.8 + \frac{congestion}{100}\right) \cdot speed
\]

### 3.2 Progress Update

\[
progress_{new} = progress_{old} + \Delta progress
\]

### 3.3 Loss Zone Condition

\[
30 < progress_{new} < 70
\]

## 4) Queue And Counters

### 4.1 Batch Queue Add

\[
queuedPackets_{new} = queuedPackets_{old} + packetTarget
\]

### 4.2 Queue Decrement Per Sent Packet

\[
queuedPackets_{new} = \max(0, queuedPackets_{old} - 1)
\]

### 4.3 Sent Counter

\[
sent_{new} = sent_{old} + 1
\]

## 5) Packet Lifetime Rules

### 5.1 Active Packet Removal

\[
active\ packet\ is\ removed\ if\ progress \ge 100
\]

### 5.2 Lost Packet TTL Update

\[
lossTtl_{new} = lossTtl_{old} - 1
\]

### 5.3 Lost Packet Removal

\[
lost\ packet\ is\ removed\ if\ lossTtl \le 0
\]

## 6) Analysis Metrics In UI

### 6.1 Active Packets

\[
activePackets = count(status = active)
\]

### 6.2 Lost Markers Visible

\[
lostPackets = count(status = lost)
\]

### 6.3 Delivered Packets

\[
deliveredPackets = \max(0,\ sent - lostTotal - activePackets)
\]

### 6.4 Observed Loss Rate

\[
observedLossRate =
\begin{cases}
\frac{lostTotal}{sent} \cdot 100, & sent > 0 \\
0, & sent = 0
\end{cases}
\]
