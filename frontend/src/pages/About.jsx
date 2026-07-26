export default function About() {
  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h2 className="section-title">About SB Lotus Tailoring Shop</h2>

      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-white)', padding: 40, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: 15 }}>Our Story</h3>
        <p style={{ color: 'var(--text-light)', lineHeight: 1.8, marginBottom: 25 }}>
          SB Lotus Tailoring Shop is dedicated to providing high-quality stitching and tailoring services. We specialise in blouse stitching, school uniforms, sudithars, tops, pants, and traditional dresses like Pavadai &amp; Sattai. Every garment is crafted with precision and care to ensure a perfect fit.
        </p>

        <h3 style={{ color: 'var(--primary)', marginBottom: 15 }}>Our Services</h3>
        <ul style={{ color: 'var(--text-light)', lineHeight: 2, paddingLeft: 20, marginBottom: 25 }}>
          <li>Blouse Stitching (without Aari work currently)</li>
          <li>School Uniforms Stitching</li>
          <li>Sudithar Stitching</li>
          <li>Tops Stitching</li>
          <li>Pants Stitching</li>
          <li>Traditional Pavadai &amp; Sattai</li>
        </ul>

        <h3 style={{ color: 'var(--primary)', marginBottom: 15 }}>Coming Soon</h3>
        <ul style={{ color: 'var(--text-light)', lineHeight: 2, paddingLeft: 20, marginBottom: 25 }}>
          <li>Sarees Collection</li>
          <li>Ready-made Pavadai</li>
          <li>Ready-made Blouse</li>
          <li>Blouse Lining</li>
          <li>Top Lining</li>
          <li>Ready-made Sudithar</li>
        </ul>

        <div style={{ background: 'var(--accent)', padding: 20, borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: 10 }}>Visit Us</h3>
          <p style={{ color: 'var(--text-light)' }}>Come to our shop for measurements and consultations. We ensure every stitch is perfect!</p>
        </div>
      </div>
    </div>
  )
}
