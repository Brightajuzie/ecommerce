import { PrismaClient, UserRole, VendorStatus, ProductStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "Fashion", slug: "fashion" },
    { name: "Home & Living", slug: "home-living" },
    { name: "Groceries", slug: "groceries" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  const SEED_PASSWORD = "12345";
  const seedPasswordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { passwordHash: seedPasswordHash },
    create: {
      email: "admin@test.com",
      passwordHash: seedPasswordHash,
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.ADMIN,
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@ikstore.dev" },
    update: { passwordHash: seedPasswordHash },
    create: {
      email: "vendor@ikstore.dev",
      passwordHash: seedPasswordHash,
      firstName: "Sample",
      lastName: "Vendor",
      role: UserRole.VENDOR,
    },
  });

  const vendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: "Sample Vendor Store",
      description: "A demo vendor used for local development and testing.",
      status: VendorStatus.APPROVED,
      commissionRate: 10.0,
    },
  });

  const electronics = await prisma.category.findUniqueOrThrow({
    where: { slug: "electronics" },
  });
  const fashion = await prisma.category.findUniqueOrThrow({
    where: { slug: "fashion" },
  });

  const sampleProducts = [
    {
      id: "ab8df624-353a-4940-bf7d-768a2383966f",
      categoryId: electronics.id,
      title: "Wireless Earbuds",
      description: "Bluetooth 5.3 wireless earbuds with charging case.",
      price: 15000,
      stock: 50,
      images: ["https://placehold.co/600x400?text=Wireless+Earbuds"],
    },
    {
      id: "6f1c3e6e-8e2e-4c34-9f2d-2a4c3f9b6a11",
      categoryId: electronics.id,
      title: "Portable Power Bank 20000mAh",
      description: "Fast-charging power bank with dual USB output.",
      price: 9500,
      stock: 80,
      images: ["https://placehold.co/600x400?text=Power+Bank"],
    },
    {
      id: "3d9a2b7c-1f5e-4a6b-8c3d-7e5f9a1b2c4d",
      categoryId: fashion.id,
      title: "Ankara Print Tote Bag",
      description: "Handmade Ankara print tote bag, lined interior.",
      price: 7000,
      stock: 30,
      images: ["https://placehold.co/600x400?text=Tote+Bag"],
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        vendorId: vendorProfile.id,
        categoryId: product.categoryId,
        title: product.title,
        description: product.description,
        price: product.price,
        currency: "NGN",
        stock: product.stock,
        images: product.images,
        status: ProductStatus.ACTIVE,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "buyer@ikstore.dev" },
    update: { passwordHash: seedPasswordHash },
    create: {
      email: "buyer@ikstore.dev",
      passwordHash: seedPasswordHash,
      firstName: "Sample",
      lastName: "Buyer",
      role: UserRole.BUYER,
    },
  });

  // Older seed runs created this account before the superadmin email changed
  // to admin@test.com — remove it so there's a single, unambiguous admin.
  await prisma.user.deleteMany({ where: { email: "admin@ikstore.dev" } });

  const SETTINGS_ID = "00000000-0000-4000-8000-000000000001";
  await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { primaryColor: "#16A34A", secondaryColor: "#0284C7" },
    create: {
      id: SETTINGS_ID,
      primaryColor: "#16A34A",
      secondaryColor: "#0284C7",
    },
  });

  const sampleSlides = [
    {
      id: "9f4b6b7a-2f0a-4b9e-8f7b-4d3f1c2a9b01",
      imageUrl: "https://placehold.co/1200x500?text=Big+Sale",
      title: "Big Sale — up to 30% off",
      sortOrder: 0,
    },
    {
      id: "9f4b6b7a-2f0a-4b9e-8f7b-4d3f1c2a9b02",
      imageUrl: "https://placehold.co/1200x500?text=New+Arrivals",
      title: "New arrivals every week",
      sortOrder: 1,
    },
  ];

  for (const slide of sampleSlides) {
    await prisma.slide.upsert({
      where: { id: slide.id },
      update: {},
      create: slide,
    });
  }

  console.log("Seed complete.");
  console.log(`  admin@test.com / ${SEED_PASSWORD}`);
  console.log(`  vendor@ikstore.dev / ${SEED_PASSWORD}`);
  console.log(`  buyer@ikstore.dev / ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
