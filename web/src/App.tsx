import { useRef } from "react";
import { Github, ArrowUpRight } from "lucide-react";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Dashboard } from "./components/Dashboard";

function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="Sturna" style={{ width: size, height: size }} className="select-none" draggable={false} />
      <div className="leading-none">
        <div className="text-[15px] font-bold tracking-[0.14em] text-white">STURNA</div>
        <div className="mono text-[9px] uppercase tracking-[0.2em] text-mint-400">private-markets desk</div>
      </div>
    </div>
  );
}

export default function App() {
  const deskRef = useRef<HTMLDivElement>(null);
  const scrollToDesk = () => deskRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-ink-950/70 backdrop-blur-xl" style={{ borderColor: "rgba(196,240,58,0.08)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Wordmark />
          <nav className="hidden items-center gap-7 text-sm text-[#8b967e] md:flex">
            <a href="#how" className="transition-colors hover:text-white">the swarm</a>
            <button onClick={scrollToDesk} className="transition-colors hover:text-white">live desk</button>
            <a href="#desk" className="transition-colors hover:text-white">holdings</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://robinhood.com/us/en/agentic-trading/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 text-xs text-[#8b967e] transition-colors hover:text-white sm:flex"
            >
              robinhood mcp <ArrowUpRight className="h-3 w-3" />
            </a>
            <button onClick={scrollToDesk} className="btn-primary px-4 py-2 text-xs">
              enter desk
            </button>
          </div>
        </div>
      </header>

      <main>
        <Hero onEnter={scrollToDesk} />
        <HowItWorks />
        <Dashboard ref={deskRef} />
      </main>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor: "rgba(196,240,58,0.08)" }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" style={{ width: 22, height: 22 }} draggable={false} />
            <span className="text-sm text-[#8b967e]">
              STURNA — autonomous private-markets desk on Robinhood Chain.
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-[#6f7a66]">
            <a href="https://docs.robinhood.com/chain/" target="_blank" rel="noreferrer" className="hover:text-white">robinhood chain</a>
            <a href="https://robinhood.com/us/en/agentic-trading/" target="_blank" rel="noreferrer" className="hover:text-white">agentic trading</a>
            <span className="inline-flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> askspecter/agent-robin</span>
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-7xl px-6">
          <p className="text-[11px] leading-relaxed text-[#5c6650]">
            Demonstration software. Portfolio marks, valuations and on-chain metrics are simulated for a
            paper book; no capital is at risk and no orders are sent to a real account. Wire the Robinhood
            Trading MCP with credentials to route live. Not investment advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
