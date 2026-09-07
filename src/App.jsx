import Header from '@/components/Header';
import Hero from '@/components/Hero';
import WhatIDid from '@/components/WhatIDid';
import WhatILike from '@/components/WhatILike';
import Footer from '@/components/Footer';
import PrivateArea from '@/components/PrivateArea';

function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-cream-50 text-navy-800 antialiased">
      <div id="top" className="absolute top-0" />
      <Header />
      <main>
        <Hero />
        <Divider />
        <WhatIDid />
        <Divider />
        <WhatILike />
        <Divider />
        <PrivateArea />
      </main>
      <Footer />
    </div>
  );
}

function Divider() {
  return <div className="mx-auto h-px w-full max-w-6xl bg-cream-300" />;
}

export default App;
