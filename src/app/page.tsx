import Conditions from "@/components/Conditions";
import Checklists from "@/components/Checklists";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSnapshot } from "@/lib/weatherCache";

// Always render on request. The server-side cache module (`weatherCache.ts`)
// dedupes upstream calls; this just ensures every page load checks for the
// freshest cached snapshot.
export const dynamic = "force-dynamic";
// Disable Next's per-route fetch cache. Freshness is owned by weatherCache.
export const fetchCache = "force-no-store";

export default async function Home() {
  const initialSnapshot = await getSnapshot();
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-[family-name:var(--font-geist-sans)] transition-colors duration-300 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 bg-blue-900 dark:bg-blue-950 text-white shadow-md py-6 px-4 md:px-8 flex items-center justify-between border-b border-blue-800 dark:border-blue-900">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-3xl font-extrabold tracking-tight">SCOW Skipper Preflight</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <Conditions initialSnapshot={initialSnapshot} />

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-blue-900 dark:text-slate-100 mb-6 border-b-2 border-blue-900 dark:border-blue-800 pb-2 uppercase tracking-tight">
            Skipper Checklists
          </h2>
          <Checklists />
        </section>
      </main>

      <footer className="mt-16 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 py-10 text-center text-sm border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <p className="mb-4 font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">SCOW Skipper Preflight Dashboard &copy; {new Date().getFullYear()}</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 px-4">
          <a href="https://scow.org/resources/Bylaws%20and%20policies/Skipper%20Boat%20Use%20Policy/SSRBUP%20Board%20Approved%202026.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 hover:underline font-medium transition-colors">SCOW SSRBUP</a>
          <a href="https://scow.org/resources/Skipper%20information/FS%20SIF/FS%20SIF%202025%20AS%20APPROVED%20%20BY%20BOARD%202%2010%202025%20Corrected.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 hover:underline font-medium transition-colors">Flying Scot SIF</a>
          <a href="https://forecast.weather.gov/MapClick.php?w3=sfcwind&w3u=1&w13u=0&w16u=1&AheadHour=0&Submit=Submit&FcstType=digital&textField1=38.8491&textField2=-77.0438&site=all&unit=0&dd=&bw=" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 hover:underline font-medium transition-colors">NWS Wind Forecast</a>
          <a href="https://tide.arthroinfo.org/tideshow.cgi?site=Reagan%2BNational%2BAirport%2C%2BWashington%2C%2BD.C.&units=f" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 hover:underline font-medium transition-colors">Arthroinfo Tides</a>
          <a href="https://www.tide-forecast.com/locations/Reagan-National-Airport-Washington-DC/tides/latest" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 hover:underline font-medium transition-colors">Tide Forecast</a>
        </div>
      </footer>
    </div>
  );
}
