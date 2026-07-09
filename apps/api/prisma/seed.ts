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
      images: ["https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "6f1c3e6e-8e2e-4c34-9f2d-2a4c3f9b6a11",
      vendorId: vendorProfile.id,
      categoryId: electronics.id,
      title: "Portable Power Bank 20000mAh",
      description: "Fast-charging power bank with dual USB output.",
      price: 9500,
      stock: 80,
      images: ["https://images.unsplash.com/photo-1592318348310-f31b61a931c8?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "3d9a2b7c-1f5e-4a6b-8c3d-7e5f9a1b2c4d",
      vendorId: vendorProfile.id,
      categoryId: fashion.id,
      title: "Ankara Print Tote Bag",
      description: "Handmade Ankara print tote bag, lined interior.",
      price: 7000,
      stock: 30,
      images: ["https://images.unsplash.com/photo-1660695828417-9cc2724bf656?w=600&h=400&fit=crop&auto=format"],
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
      images: ["https://images.unsplash.com/photo-1568347355280-d33fdf77d42a?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "a62fc350-54a1-4cd1-995e-3ad22506e572",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Brown Beans - 5kg",
      description: "Sorted brown beans (oloyin), 5kg bag.",
      price: 9000,
      stock: 90,
      images: ["https://images.unsplash.com/photo-1613758235402-745466bb7efe?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "eb4c3b8a-b4a2-4018-b237-6c478adf43a9",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Vegetable Oil - 5 Litres",
      description: "Pure vegetable cooking oil, 5-litre keg.",
      price: 12000,
      stock: 70,
      images: ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "201a9804-3f5f-43a6-acaa-de367c06b35d",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Yellow Garri - 2kg",
      description: "Well-sifted yellow garri, 2kg bag.",
      price: 2500,
      stock: 150,
      images: ["https://images.unsplash.com/photo-1757281096972-10fd02b0f5ea?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "0d035d54-f7af-4e05-b3ea-c05ebdbeb563",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Semovita - 2kg",
      description: "Smooth semolina meal, 2kg pack.",
      price: 3200,
      stock: 100,
      images: ["https://images.unsplash.com/photo-1749169439872-7cee08d9a71b?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "a7e12255-63ed-408a-9c9e-3df7ee342703",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Tomato Paste - Carton of 12",
      description: "210g tins of tomato paste, carton of 12.",
      price: 8000,
      stock: 60,
      images: ["https://images.unsplash.com/photo-1619995746608-bef3de4f075a?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "b011496f-c7a7-4f12-8a6a-79ef047d4695",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Granulated Sugar - 1kg",
      description: "Refined granulated white sugar, 1kg pack.",
      price: 1800,
      stock: 200,
      images: ["https://images.unsplash.com/photo-1673791031093-eb8eefa60083?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "0318fc2f-e491-4e52-bff4-bef4ab5d5f21",
      vendorId: groceryVendorProfile.id,
      categoryId: groceries.id,
      title: "Iodized Salt - 500g",
      description: "Refined iodized table salt, 500g pack.",
      price: 500,
      stock: 300,
      images: ["https://images.unsplash.com/photo-1646722670581-974d084e0ec0?w=600&h=400&fit=crop&auto=format"],
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
      images: ["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "d720a090-a3e1-4954-b3e5-afe272290d30",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Bottled Water - Pack of 12",
      description: "75cl bottled table water, pack of 12.",
      price: 2000,
      stock: 150,
      images: ["https://images.unsplash.com/photo-1536939459926-301728717817?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "139909c3-3029-49d3-b0b1-df1234c0f211",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Cola Soft Drink - Pack of 24",
      description: "35cl cola soft drink cans, pack of 24.",
      price: 9600,
      stock: 100,
      images: ["https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "04c102dc-652f-4934-ba13-83a41151f628",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Chocolate Malt Drink - 500g Tin",
      description: "Fortified chocolate malt drink powder, 500g tin.",
      price: 4200,
      stock: 90,
      images: ["https://images.unsplash.com/photo-1590331018411-bf4b58f44a4b?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "25c0f382-4833-4d63-8257-1d1198e2eed6",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Instant Coffee - 200g Jar",
      description: "Rich roast instant coffee, 200g jar.",
      price: 5500,
      stock: 60,
      images: ["https://images.unsplash.com/photo-1618401375129-8c6a8ef678b9?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "4f6aeff5-6c44-4607-b898-cadae0bd4926",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Digestive Biscuits - Pack of 10",
      description: "Wholewheat digestive biscuits, pack of 10.",
      price: 3000,
      stock: 110,
      images: ["https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&h=400&fit=crop&auto=format"],
    },
    {
      id: "615e8817-a4cf-4aca-aa4f-91c55b76ef42",
      vendorId: groceryVendorProfile.id,
      categoryId: foodBeverages.id,
      title: "Yellow Label Tea - 100 Bags",
      description: "Classic black tea, box of 100 tea bags.",
      price: 2800,
      stock: 130,
      images: ["https://images.unsplash.com/photo-1546648596-d8318bfcf491?w=600&h=400&fit=crop&auto=format"],
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: { images: product.images },
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
    update: {
      primaryColor: "#15803D",
      secondaryColor: "#65A30D",
      accentColor: "#ECFDF5",
    },
    create: {
      id: SETTINGS_ID,
      primaryColor: "#15803D",
      secondaryColor: "#65A30D",
      accentColor: "#ECFDF5",
    },
  });

  const sampleSlides = [
    {
      id: "9f4b6b7a-2f0a-4b9e-8f7b-4d3f1c2a9b01",
      imageUrl: "https://images.unsplash.com/photo-1577538928305-3807c3993047?w=1200&h=500&fit=crop&auto=format",
      title: "Big Sale — up to 30% off",
      sortOrder: 0,
    },
    {
      id: "9f4b6b7a-2f0a-4b9e-8f7b-4d3f1c2a9b02",
      imageUrl: "https://images.unsplash.com/photo-1670684684445-a4504dca0bbc?w=1200&h=500&fit=crop&auto=format",
      title: "New arrivals every week",
      sortOrder: 1,
    },
  ];

  for (const slide of sampleSlides) {
    await prisma.slide.upsert({
      where: { id: slide.id },
      update: { imageUrl: slide.imageUrl },
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
