"""
Seed script - populates the database with sample categories and products.
Run this AFTER starting the app at least once (so tables are created).

Usage: python seed_data.py
"""
from app import create_app
from models import db, Category, Product

app = create_app()

with app.app_context():
    # Skip if data already exists
    if Category.query.count() > 0:
        print('Data already exists. Skipping seed.')
        exit()

    # ── Categories ───────────────────────────────────────────
    categories = [
        Category(name='Blouse', description='Custom and ready-made blouse stitching', category_type='stitching'),
        Category(name='School Uniform', description='School uniforms for all grades', category_type='stitching'),
        Category(name='Sudithar', description='Traditional sudithar stitching', category_type='stitching'),
        Category(name='Tops', description='Modern tops stitching', category_type='stitching'),
        Category(name='Pants', description='All types of pants stitching', category_type='stitching'),
        Category(name='Pavadai & Sattai', description='Traditional pavadai and sattai sets', category_type='stitching'),
        # Future categories
        Category(name='Sarees', description='Beautiful saree collection', category_type='readymade'),
        Category(name='Ready-made Pavadai', description='Ready to wear pavadai', category_type='readymade'),
        Category(name='Ready-made Blouse', description='Pre-stitched blouses', category_type='readymade'),
        Category(name='Blouse Lining', description='Blouse lining materials', category_type='readymade'),
        Category(name='Top Lining', description='Top lining materials', category_type='readymade'),
        Category(name='Ready-made Sudithar', description='Ready to wear sudithars', category_type='readymade'),
    ]
    db.session.add_all(categories)
    db.session.flush()

    # Get category IDs
    cat = {c.name: c.id for c in categories}

    # ── Products ─────────────────────────────────────────────
    products = [
        # Blouse designs (custom blouse feature)
        Product(name='Classic Silk Blouse Design', description='Elegant silk blouse with traditional pattern. Perfect for weddings and special occasions.', price=800.00, category_id=cat['Blouse'], is_custom_blouse=True),
        Product(name='Cotton Daily Wear Blouse', description='Comfortable cotton blouse for everyday wear. Simple and elegant design.', price=400.00, category_id=cat['Blouse'], is_custom_blouse=True),
        Product(name='Pattu Blouse Design', description='Beautiful pattu blouse with intricate border work. Ideal for festival occasions.', price=1200.00, category_id=cat['Blouse'], is_custom_blouse=True),
        Product(name='Back Neck Design Blouse', description='Stylish back neck design blouse. Modern cut with traditional elements.', price=650.00, category_id=cat['Blouse'], is_custom_blouse=True),

        # School Uniforms
        Product(name='Primary School Uniform Set', description='Complete uniform set for primary school students. Includes shirt and skirt/pants.', price=500.00, category_id=cat['School Uniform'], stock=20),
        Product(name='High School Uniform Set', description='Standard high school uniform with proper measurements.', price=600.00, category_id=cat['School Uniform'], stock=15),
        Product(name='Sports Uniform', description='Comfortable sports uniform for school activities.', price=450.00, category_id=cat['School Uniform'], stock=10),

        # Sudithar
        Product(name='Cotton Sudithar', description='Lightweight cotton sudithar for daily wear. Available in multiple colours.', price=700.00, category_id=cat['Sudithar']),
        Product(name='Silk Sudithar Set', description='Premium silk sudithar set with matching dupatta. Perfect for occasions.', price=1500.00, category_id=cat['Sudithar']),

        # Tops
        Product(name='Casual Cotton Top', description='Trendy casual top. Comfortable fabric with modern design.', price=350.00, category_id=cat['Tops']),
        Product(name='Formal Top', description='Elegant formal top suitable for office and meetings.', price=500.00, category_id=cat['Tops']),

        # Pants
        Product(name='Cotton Palazzo Pants', description='Wide leg palazzo pants. Comfortable and stylish.', price=450.00, category_id=cat['Pants']),
        Product(name='Churidar Pants', description='Traditional churidar pants with perfect pleating.', price=350.00, category_id=cat['Pants']),

        # Pavadai & Sattai
        Product(name='Silk Pavadai Sattai Set', description='Traditional silk pavadai and sattai for young girls. Beautiful colours available.', price=900.00, category_id=cat['Pavadai & Sattai']),
        Product(name='Cotton Pavadai Set', description='Comfortable cotton pavadai set for daily wear.', price=500.00, category_id=cat['Pavadai & Sattai']),

        # Future ready-made items (samples)
        Product(name='Kanchipuram Silk Saree', description='Authentic Kanchipuram silk saree with gold zari work.', price=5000.00, category_id=cat['Sarees'], stock=5),
        Product(name='Ready-made Pattu Pavadai', description='Pre-made pattu pavadai in vibrant colours. Available in sizes S, M, L.', price=1200.00, category_id=cat['Ready-made Pavadai'], stock=8),
        Product(name='Ready-made Cotton Blouse', description='Pre-stitched cotton blouse available in standard sizes.', price=300.00, category_id=cat['Ready-made Blouse'], stock=20),
    ]
    db.session.add_all(products)
    db.session.commit()

    print(f'Seeded {len(categories)} categories and {len(products)} products successfully!')
