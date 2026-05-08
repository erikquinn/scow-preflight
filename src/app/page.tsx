import Image from "next/image";
import Conditions from "@/components/Conditions";
import Checklists from "@/components/Checklists";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 font-[family-name:var(--font-geist-sans)]">
      <header className="bg-blue-950 text-white shadow-md py-6 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-3xl font-bold tracking-tight">SCOW Preflight</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <Conditions />
        
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-blue-900 pb-2">
            Rigging the Rumba
          </h2>
          <Checklists />
        </section>
      </main>

      <footer className="mt-16 bg-slate-800 text-slate-400 py-6 text-center text-sm">
        <p>SCOW Preflight Dashboard &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
