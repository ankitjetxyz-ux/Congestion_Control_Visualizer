# Congestion Control Visualizer

An interactive web-based educational tool that simulates how data traffic behaves in a network under different congestion conditions.

## About

This project visually demonstrates key networking concepts such as:
- **Packet Transmission** - Real-time visualization of packets moving through network nodes
- **Network Delay** - How latency affects data delivery and system responsiveness
- **Packet Loss** - The impact of lost packets on network quality and throughput
- **Throughput** - Effective data transfer rates measured in real-time

Using dynamic animations and real-time metrics, the simulator helps users understand how congestion control mechanisms manage traffic efficiently. The tool is designed for educational purposes, making complex networking concepts easy to visualize and analyze.

## Features

✨ **Interactive Network Simulation** - Play, pause, and control the pace of packet flow
📈 **Real-Time Metrics Dashboard** - Live statistics for throughput, delay, congestion, and loss
🎚️ **Configurable Parameters** - Adjust network conditions interactively
🎬 **Smooth Animations** - Fluid CSS animations showing packet movement
📊 **Historical Data Tracking** - (Planned) Export and review metrics over time
🎓 **Educational Mode** - Built-in explanations and tooltips
🔄 **Multiple Algorithms** - (Planned) Compare different congestion control algorithms
📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## Technology Stack

### Frontend
- **React 18** - UI framework for dynamic components
- **TypeScript** - Type-safe development
- **CSS3** - Animations and responsive design
- **Vite** - Fast build tool with lightning-quick HMR

### State Management
- **React Hooks** (useState, useEffect) - State and side effects
- **Custom Hooks** - Reusable simulator logic

### Graphics & Visualization
- **CSS Animations** - Smooth packet movement
- **SVG** - Diagrams and visual elements
- **Canvas API** - (Future) For advanced network graphs

## Project Structure

```
src/
├── App.tsx              # Main application component
├── App.css              # Application styling
├── main.tsx             # React entry point
├── index.css            # Global styles
└── assets/              # Images and static files
```

## Architecture

```
┌─────────────────────────────────────────────┐
│          React Application (App.tsx)         │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐ │
│  │   UI Components Layer                   │ │
│  │  - Network Simulator visualization      │ │
│  │  - Metrics Dashboard                    │ │
│  │  - Control Panel                        │ │
│  └─────────────────────────────────────────┘ │
│              ▼                               │
│  ┌─────────────────────────────────────────┐ │
│  │   Simulator Engine Layer                │ │
│  │  - Packet Management                    │ │
│  │  - Congestion Algorithms                │ │
│  │  - Network State Tracking               │ │
│  └─────────────────────────────────────────┘ │
│              ▼                               │
│  ┌─────────────────────────────────────────┐ │
│  │   Data Layer                            │ │
│  │  - Metrics State                        │ │
│  │  - Packet Queue                         │ │
│  │  - Configuration State                  │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server
The development server runs on `http://localhost:5174/` with hot module replacement (HMR) enabled.

## UI/UX Design

### Layout Structure
- Header with project title and navigation tabs
- Main content area with tabbed sections (Overview, Features, Tech Stack, UI Ideas, Viva, Simulator)
- Full-width footer with project information

### Visual Design
- Modern gradient color scheme (blues and purples for network theme)
- Clean card-based layout for organized information
- Color-coded packet visualization:
  - 🟢 Green: Transmitted packets
  - 🔴 Red: Lost packets
  - 🟡 Yellow: In-transit packets
- Smooth transitions and subtle animations throughout

### Simulator View
- Network diagram showing source and destination nodes
- Real-time packet flow visualization
- Interactive metric gauges and displays
- Parameter adjustment sliders for loss rate and congestion
- Play/Pause/Reset control buttons
- Speed control for simulation tempo

### Accessibility
- High contrast color choices
- ARIA labels for interactive elements
- Keyboard navigation support
- Readable font sizes and spacing

## Viva Explanation

### Quick Introduction
This is an interactive educational tool for understanding network congestion control. It simulates how packets move through a network and shows how congestion affects performance through real-time animations and metrics.

### Problem Statement
Students struggle to understand abstract networking concepts like congestion control algorithms. This tool makes these concepts tangible through visual animations, interactive parameters, and real-time feedback.

### Technical Implementation
Built with React and TypeScript for robust development. Uses React Hooks for state management and a game loop animation system to process packets frame-by-frame, calculating congestion effects in real-time.

### Key Features
- Adjustable network parameters
- Real-time metrics dashboard
- Multiple congestion control algorithms (future)
- Smooth animations
- Responsive design

### Challenges & Solutions
- **Performance**: Optimized packet rendering by culling off-screen packets
- **Clarity**: Added color-coding and annotations to make algorithms understandable

### Future Enhancements
- Network graph visualization using D3.js or Three.js
- Export functionality for metrics as CSV or charts
- Additional algorithms like CUBIC and BBR
- Multiplayer mode for competitive bandwidth scenarios

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Author

Congestion Control Simulator - Educational Tool for Networking Concepts

Built with ❤️ using React, TypeScript, and Vite
```
