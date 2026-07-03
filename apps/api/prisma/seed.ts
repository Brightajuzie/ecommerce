import { PrismaClient, UserRole, VendorStatus, ProductStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "Fashion", slug: "fashion" },
    { name: "Home & Living", slug: "home-living" },
    { name: "Groceries", slug: "groceries" },
    { name: "Food & Beverages", slug: "food-beverages" },
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

  const groceryVendorUser = await prisma.user.upsert({
    where: { email: "freshmart@ikstore.dev" },
    update: { passwordHash: seedPasswordHash },
    create: {
      email: "freshmart@ikstore.dev",
      passwordHash: seedPasswordHash,
      firstName: "FreshMart",
      lastName: "Groceries",
      role: UserRole.VENDOR,
    },
  });

  const groceryVendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: groceryVendorUser.id },
    update: {},
    create: {
      userId: groceryVendorUser.id,
      businessName: "FreshMart Groceries",
      description: "Everyday groceries, pantry staples, and beverages.",
      status: VendorStatus.APPROVED,
      commissionRate: 8.0,
    },
  });

  const electronics = await prisma.category.findUniqueOrThrow({
    where: { slug: "electronics" },
  });
  const fashion = await prisma.category.findUniqueOrThrow({
    where: { slug: "fashion" },
  });
  const groceries = await prisma.category.findUniqueOrThrow({
    where: { slug: "groceries" },
  });
  const foodBeverages = await prisma.category.findUniqueOrThrow({
    where: { slug: "food-beverages" },
  });

  const sampleProducts = [
    {
      id: "ab8df624-353a-4940-bf7d-768a2383966f",
      vendorId: vendorProfile.id,
      categoryId: electronics.id,
      title: "Wireless Earbuds",
      description: "Bluetooth 5.3 wireless earbuds with charging case.",
      price: 15000,
      stock: 50,
      images: ["https://placehold.co/600x400?text=Wireless+Earbuds"],
    },
    {
      id: "6f1c3e6e-8e2e-4c34-9f2d-2a4c3f9b6a11",
      vendorId: vendorProfile.id,
      categoryId: electronics.id,
      title: "Portable Power Bank 20000mAh",
      description: "Fast-charging power bank with dual USB output.",
      price: 9500,
      stock: 80,
      images: ["https://placehold.co/600x400?text=Power+Bank"],
    },
    {
      id: "3d9a2b7c-1f5e-4a6b-8c3d-7e5f9a1b2c4d",
      vendorId: vendorProfile.id,
      categoryId: fashion.id,
      title: "Ankara Print Tote Bag",
      description: "Handmade Ankara print tote bag, lined interior.",
      price: 7000,
      stock: 30,
      images: ["https://placehold.co/600x400?text=Tote+Bag"],
    },
    // Groceries
    {
      id: "b9cbc376-0608-43c3-8d0a-1f461e441f1a",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Long Grain Rice - 5kg Bag",
      description: "Premium long grain parboiled rice, 5kg bag.",
      price: 8500,
      stock: 120,
      images: ["https://placehold.co/600x400?text=Rice+5kg"],
    },
    {
      id: "a62fc350-54a1-4cd1-995e-3ad22506e572",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Brown Beans - 5kg",
      description: "Sorted brown beans (oloyin), 5kg bag.",
      price: 9000,
      stock: 90,
      images: ["https://placehold.co/600x400?text=Beans+5kg"],
    },
    {
      id: "eb4c3b8a-b4a2-4018-b237-6c478adf43a9",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Vegetable Oil - 5 Litres",
      description: "Pure vegetable cooking oil, 5-litre keg.",
      price: 12000,
      stock: 70,
      images: ["https://placehold.co/600x400?text=Vegetable+Oil"],
    },
    {
      id: "201a9804-3f5f-43a6-acaa-de367c06b35d",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Yellow Garri - 2kg",
      description: "Well-sifted yellow garri, 2kg bag.",
      price: 2500,
      stock: 150,
      images: ["https://placehold.co/600x400?text=Garri+2kg"],
    },
    {
      id: "0d035d54-f7af-4e05-b3ea-c05ebdbeb563",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Semovita - 2kg",
      description: "Smooth semolina meal, 2kg pack.",
      price: 3200,
      stock: 100,
      images: ["https://placehold.co/600x400?text=Semovita"],
    },
    {
      id: "a7e12255-63ed-408a-9c9e-3df7ee342703",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Tomato Paste - Carton of 12",
      description: "210g tins of tomato paste, carton of 12.",
      price: 8000,
      stock: 60,
      images: ["https://placehold.co/600x400?text=Tomato+Paste"],
    },
    {
      id: "b011496f-c7a7-4f12-8a6a-79ef047d4695",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Granulated Sugar - 1kg",
      description: "Refined granulated white sugar, 1kg pack.",
      price: 1800,
      stock: 200,
      images: ["https://placehold.co/600x400?text=Sugar+1kg"],
    },
    {
      id: "0318fc2f-e491-4e52-bff4-bef4ab5d5f21",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Iodized Salt - 500g",
      description: "Refined iodized table salt, 500g pack.",
      price: 500,
      stock: 300,
      images: ["https://placehold.co/600x400?text=Salt+500g"],
    },
    // Food & Beverages
    {
      id: "22c036eb-0f55-4765-8078-e71f582f3c91",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Instant Noodles - Carton of 40",
      description: "Chicken-flavored instant noodles, carton of 40 packs.",
      price: 10500,
      stock: 80,
      images: ["https://placehold.co/600x400?text=Instant+Noodles"],
    },
    {
      id: "d720a090-a3e1-4954-b3e5-afe272290d30",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Bottled Water - Pack of 12",
      description: "75cl bottled table water, pack of 12.",
      price: 2000,
      stock: 150,
      images: ["https://placehold.co/600x400?text=Bottled+Water"],
    },
    {
      id: "139909c3-3029-49d3-b0b1-df1234c0f211",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Cola Soft Drink - Pack of 24",
      description: "35cl cola soft drink cans, pack of 24.",
      price: 9600,
      stock: 100,
      images: ["https://placehold.co/600x400?text=Soft+Drink"],
    },
    {
      id: "04c102dc-652f-4934-ba13-83a41151f628",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Chocolate Malt Drink - 500g Tin",
      description: "Fortified chocolate malt drink powder, 500g tin.",
      price: 4200,
      stock: 90,
      images: ["https://placehold.co/600x400?text=Malt+Drink"],
    },
    {
      id: "25c0f382-4833-4d63-8257-1d1198e2eed6",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Instant Coffee - 200g Jar",
      description: "Rich roast instant coffee, 200g jar.",
      price: 5500,
      stock: 60,
      images: ["https://placehold.co/600x400?text=Coffee+200g"],
    },
    {
      id: "4f6aeff5-6c44-4607-b898-cadae0bd4926",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Digestive Biscuits - Pack of 10",
      description: "Wholewheat digestive biscuits, pack of 10.",
      price: 3000,
      stock: 110,
      images: ["https://placehold.co/600x400?text=Biscuits"],
    },
    {
      id: "615e8817-a4cf-4aca-aa4f-91c55b76ef42",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Yellow Label Tea - 100 Bags",
      description: "Classic black tea, box of 100 tea bags.",
      price: 2800,
      stock: 130,
      images: ["https://placehold.co/600x400?text=Tea+100+Bags"],
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        vendorId: product.vendorId,
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
  console.log(`  freshmart@ikstore.dev / ${SEED_PASSWORD}`);
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
