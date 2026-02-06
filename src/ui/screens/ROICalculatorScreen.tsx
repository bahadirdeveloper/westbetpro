import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function ROICalculatorScreen() {
  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="roi-hesaplayici" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Kasa Motoru" searchPlaceholder="Araclarda ara..." />

        <section className="p-8">
          <div className="mb-8">
            <h2 className="text-4xl font-western text-white mb-2 tracking-wide">ROI Hesaplayici</h2>
            <p className="text-slate-400">Yatiriminizin getirisini ve risk dengenizi hesaplayin.</p>
          </div>

          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-card-dark border border-aged-gold/20 rounded-2xl p-12 text-center max-w-lg">
              <span className="material-icons-round text-6xl text-aged-gold/40 mb-6 block">calculate</span>
              <h3 className="font-western text-2xl text-aged-gold mb-4">YAKINDA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                ROI hesaplayici su anda gelistirme asamasindadir.
                Yakin zamanda yatirim getirisi hesaplama, kasa analizi ve risk yonetimi araclari burada yer alacak.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MobileNav activeTab="roi-hesaplayici" />
    </div>
  );
}
