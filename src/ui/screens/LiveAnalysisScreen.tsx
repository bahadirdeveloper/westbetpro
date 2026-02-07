import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function LiveAnalysisScreen() {
  return (
    <div className="bg-gunmetal-dark text-slate-100 font-display min-h-screen western-pattern">
      <Sidebar activeTab="canli-analiz" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Av Sahasi" searchPlaceholder="Mac veya lig ara..." />

        <section className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-western text-white mb-2 tracking-wide uppercase">Canli Av Sahasi</h2>
            <p className="text-slate-400 text-sm sm:text-base">Yapay zekanin radarindaki sicak duellolar.</p>
          </div>

          <div className="flex flex-col items-center justify-center py-12 sm:py-24">
            <div className="bg-gunmetal border border-aged-gold/20 rounded-2xl p-6 sm:p-12 text-center max-w-lg">
              <span className="material-icons-round text-6xl text-aged-gold/40 mb-6 block">construction</span>
              <h3 className="font-western text-2xl text-aged-gold mb-4">YAKINDA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Canli analiz modulu su anda gelistirme asamasindadir.
                Yakin zamanda canli mac takibi ve yapay zeka destekli anlik analizler burada yer alacak.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MobileNav activeTab="canli-analiz" />
    </div>
  );
}
