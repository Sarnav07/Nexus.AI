const AmbientOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div
      className="ambient-orb w-[600px] h-[600px] top-[-10%] left-[20%] animate-float"
      style={{ background: "radial-gradient(circle, rgba(224,255,0,0.06) 0%, transparent 70%)" }}
    />
    <div
      className="ambient-orb w-[500px] h-[500px] bottom-[10%] right-[10%] animate-float"
      style={{
        background: "radial-gradient(circle, rgba(121,40,202,0.05) 0%, transparent 70%)",
        animationDelay: "3s",
      }}
    />
    <div
      className="ambient-orb w-[400px] h-[400px] top-[40%] left-[-5%] animate-float"
      style={{
        background: "radial-gradient(circle, rgba(255,0,122,0.04) 0%, transparent 70%)",
        animationDelay: "1.5s",
      }}
    />
  </div>
);

export default AmbientOrbs;
