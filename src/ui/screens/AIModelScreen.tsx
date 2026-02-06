import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function AIModelScreen() {
  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="ai-model" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Yapay Zeka Motoru" searchPlaceholder="Kural veya parametre ara..." />

        <section className="p-8">
          <div className="mb-8">
            <h2 className="text-4xl font-western text-white mb-2 tracking-wide">AI Model Detay ve Kurallar</h2>
            <p className="text-slate-400">Model fabrikamiz tarafindan islenen uzman kurallar ve isabet oranlari.</p>
          </div>

          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-card-dark border border-aged-gold/20 rounded-2xl p-12 text-center max-w-lg">
              <span className="material-icons-round text-6xl text-aged-gold/40 mb-6 block">psychology</span>
              <h3 className="font-western text-2xl text-aged-gold mb-4">YAKINDA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI model detay sayfasi su anda gelistirme asamasindadir.
                Yakin zamanda yapay zeka kurallarinin detaylari, isabet oranlari ve model performans metrikleri burada yer alacak.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MobileNav activeTab="ai-model" />
    </div>
  );
}
