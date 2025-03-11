import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAllowedSections } from "@/lib/check-employee";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/order.model";
import Product from "@/models/product.model";
import Customer from "@/models/customer.model";
import Review from "@/models/review.model";
import Brand from "@/models/brand.model";
import Category from "@/models/category.model";
import Shipping from "@/models/shipping.model";

interface TopCustomer {
  name: string;
  totalSpent: number;
  reviewCount?: number;
}

interface Statistics {
  orders: {
    total: number;
    statusDistribution: Record<string, number>;
    totalRevenue: number;
    averageOrderValue: number;
    shippingMethodDistribution: { method: string; count: number; revenue: number }[];
  };
  products: {
    total: number;
    outOfStock: number;
    lowStock: number;
    topSelling: Array<{ name: string; totalSold: number }>;
    brandPerformance: Array<{ name: string; productsSold: number; revenue: number; totalProducts: number }>;
    categoryPerformance: Array<{ name: string; productsSold: number; revenue: number; totalProducts: number }>;
  };
  customers: {
    total: number;
    newThisMonth: number;
    averageSpending: number;
    topCustomers: TopCustomer[];
  };
  reviews: {
    total: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    statusDistribution: Record<string, number>;
    recentReviews: number;
  };
}

const getTotalStock = (p: any) =>
  p.variants?.length ? p.variants.reduce((s: number, v: any) => s + (v.stock || 0), 0) : (p.stock || 0);

async function getStatistics(): Promise<Statistics> {
  await connectToDatabase();
  const [orders, products, customers, reviews, brands, categories] = await Promise.all([
    Order.find().populate('shippingMethodId').lean(),
    Product.find().lean(),
    Customer.find().lean(),
    Review.find().lean(),
    Brand.find().lean(),
    Category.find().lean(),
    Shipping.find().lean()
  ]);

  const brandPerf = new Map<string, { name: string; productsSold: number; revenue: number; totalProducts: number }>();
  const catPerf = new Map<string, { name: string; productsSold: number; revenue: number; totalProducts: number }>();
  categories.forEach(cat =>
    catPerf.set((cat._id as { toString(): string }).toString(), { name: cat.name as string, productsSold: 0, revenue: 0, totalProducts: 0 })
  );

  products.forEach(p => {
    const bId = p.brand?.toString();
    if (bId) {
      const bp =
        brandPerf.get(bId) ||
        {
          name: brands.find((b: any) => b._id.toString() === bId)?.name || "علامة تجارية غير معروفة",
          productsSold: 0,
          revenue: 0,
          totalProducts: 0
        };
      bp.totalProducts++;
      brandPerf.set(bId, bp);
    }
    const cId = p.category?.toString();
    if (cId && catPerf.has(cId)) {
      const cp = catPerf.get(cId)!;
      cp.totalProducts++;
      catPerf.set(cId, cp);
    }
  });

  orders.forEach(o => {
    o.items.forEach((item: any) => {
      const product = products.find((p: any) => p._id.toString() === item.productId.toString());
      if (product) {
        const bId = product.brand?.toString();
        if (bId && brandPerf.has(bId)) {
          const bp = brandPerf.get(bId)!;
          bp.productsSold += item.quantity;
          bp.revenue += item.finalPrice;
          brandPerf.set(bId, bp);
        }
        const cId = product.category?.toString();
        if (cId && catPerf.has(cId)) {
          const cp = catPerf.get(cId)!;
          cp.productsSold += item.quantity;
          cp.revenue += item.finalPrice;
          catPerf.set(cId, cp);
        }
      }
    });
  });

  const sortedBrandPerformance = Array.from(brandPerf.values()).sort((a, b) => b.revenue - a.revenue);
  const sortedCategoryPerformance = Array.from(catPerf.values()).sort((a, b) => b.revenue - a.revenue);

  const outOfStock = products.filter(p => getTotalStock(p) === 0).length;
  const lowStock = products.filter(p => {
    const ts = getTotalStock(p);
    return ts > 0 && ts <= 5;
  }).length;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newCustomers = customers.filter(c => new Date(c.createdAt) >= startOfMonth).length;

  const statusDistribution = orders.reduce((acc: any, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const totalRevenue = orders.reduce(
    (sum: any, o: any) => sum + o.items.reduce((s: any, i: any) => s + i.finalPrice, 0),
    0
  );

  const customerSpending = new Map<string, number>();
  orders.forEach(o => {
    if (o.customerId) {
      const id = o.customerId.toString();
      const orderTotal = o.items.reduce((s: any, i: any) => s + i.finalPrice, 0);
      customerSpending.set(id, (customerSpending.get(id) || 0) + orderTotal);
    }
  });
  const customerReviews = new Map<string, number>();
  reviews.forEach(r => {
    if (r.user) {
      const id = r.user.toString();
      customerReviews.set(id, (customerReviews.get(id) || 0) + 1);
    }
  });
  const topCustomers = await Promise.all(
    Array.from(customerSpending.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(async ([id, totalSpent]) => {
        const customer = customers.find((c: any) => c._id.toString() === id);
        return { name: customer?.name || "عميل غير معروف", totalSpent, reviewCount: customerReviews.get(id) || 0 };
      })
  );

  const reviewStatusDistribution = reviews.reduce((acc: any, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const ratingDistribution = reviews.reduce((acc: any, r: any) => {
    acc[r.rating] = (acc[r.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  const averageRating = reviews.length ? reviews.reduce((s: any, r: any) => s + r.rating, 0) / reviews.length : 0;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentReviews = reviews.filter(r => new Date(r.createdAt) >= oneWeekAgo).length;

  const shippingMethodDistribution = orders.reduce((acc: any[], o: any) => {
    if (o.shippingMethodId) {
      const methodName = o.shippingMethodId.name || "طريقة شحن غير معروفة";
      const orderRev = o.items.reduce((s: number, i: any) => s + i.finalPrice, 0);
      
      const existingMethod = acc.find(m => m.method === methodName);
      if (existingMethod) {
        existingMethod.count++;
        existingMethod.revenue += orderRev;
      } else {
        acc.push({
          method: methodName,
          count: 1,
          revenue: orderRev
        });
      }
    }
    return acc;
  }, []);

  return {
    orders: {
      total: orders.length,
      statusDistribution,
      totalRevenue,
      averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
      shippingMethodDistribution: shippingMethodDistribution.sort((a, b) => b.revenue - a.revenue)
    },
    products: {
      total: products.length,
      outOfStock,
      lowStock,
      topSelling: [],
      brandPerformance: sortedBrandPerformance,
      categoryPerformance: sortedCategoryPerformance
    },
    customers: {
      total: customers.length,
      newThisMonth: newCustomers,
      averageSpending: customers.length ? totalRevenue / customers.length : 0,
      topCustomers: topCustomers.map(customer => ({
        name: String(customer.name),
        totalSpent: customer.totalSpent,
        reviewCount: customer.reviewCount
      })) as TopCustomer[]
    },
    reviews: {
      total: reviews.length,
      averageRating,
      ratingDistribution,
      statusDistribution: reviewStatusDistribution,
      recentReviews
    }
  };
}

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth");
  if (!getAllowedSections(session.user?.permissions).includes("statistics")) redirect("/dashboard");
  const stats = await getStatistics();
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">الإحصائيات</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "إجمالي الطلبات", value: stats.orders.total, color: "text-blue-600" },
          { label: "إجمالي المبيعات", value: stats.orders.totalRevenue.toLocaleString() + " ر.س", color: "text-green-600" },
          { label: "متوسط قيمة الطلب", value: stats.orders.averageOrderValue.toLocaleString() + " ر.س", color: "text-purple-600" },
          { label: "إجمالي المنتجات", value: stats.products.total, color: "text-orange-600" }
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">{item.label}</h3>
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">توزيع حالات الطلبات</h3>
          <div className="space-y-4">
            {Object.entries(stats.orders.statusDistribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="font-medium">{getStatusLabel(status)}</span>
                <span className="px-3 py-1 rounded-full text-sm" style={getStatusStyle(status)}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">حالة المخزون</h3>
          <div className="space-y-4">
            {[
              { label: "نفذت من المخزون", value: stats.products.outOfStock, style: "bg-red-100 text-red-800" },
              { label: "مخزون منخفض", value: stats.products.lowStock, style: "bg-yellow-100 text-yellow-800" }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-medium">{item.label}</span>
                <span className={`px-3 py-1 rounded-full ${item.style}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">إحصائيات العملاء</h3>
          <div className="space-y-4">
            {[
              { label: "إجمالي العملاء", value: stats.customers.total, style: "bg-blue-100 text-blue-800" },
              { label: "عملاء جدد (هذا الشهر)", value: stats.customers.newThisMonth, style: "bg-green-100 text-green-800" },
              { label: "متوسط الإنفاق للعميل", value: stats.customers.averageSpending.toLocaleString() + " ر.س", style: "bg-purple-100 text-purple-800" }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-medium">{item.label}</span>
                <span className={`px-3 py-1 rounded-full ${item.style}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">أفضل العملاء</h3>
          <div className="space-y-4">
            {stats.customers.topCustomers.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-medium">{c.name}</span>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">
                    {c.totalSpent.toLocaleString()} ر.س
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                    {c.reviewCount} تقييم
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">إحصائيات التقييمات</h3>
          <div className="space-y-4">
            {[
              { label: "إجمالي التقييمات", value: stats.reviews.total, style: "bg-blue-100 text-blue-800" },
              { label: "متوسط التقييم", value: stats.reviews.averageRating.toFixed(1) + " / 5", style: "bg-yellow-100 text-yellow-800" },
              { label: "تقييمات جديدة (آخر 7 أيام)", value: stats.reviews.recentReviews, style: "bg-green-100 text-green-800" }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-medium">{item.label}</span>
                <span className={`px-3 py-1 rounded-full ${item.style}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">توزيع التقييمات</h3>
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map(r => (
              <div key={r} className="flex items-center justify-between">
                <span className="font-medium">{r} نجوم</span>
                <span
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: `rgba(59,130,246,${0.2 + (r - 1) * 0.2})`, color: "#1E40AF" }}
                >
                  {stats.reviews.ratingDistribution[r] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">أداء العلامات التجارية</h3>
        <div className="space-y-4">
          {stats.products.brandPerformance.map((b, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="font-medium">{b.name}</span>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                  {b.totalProducts} منتج متوفر
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                  {b.productsSold} منتج مباع
                </span>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">
                  {b.revenue.toLocaleString()} ر.س
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">أداء الفئات</h3>
        <div className="space-y-4">
          {stats.products.categoryPerformance.map((c, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                  {c.totalProducts} منتج متوفر
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                  {c.productsSold} منتج مباع
                </span>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">
                  {c.revenue.toLocaleString()} ر.س
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">إحصائيات طرق الشحن</h3>
        <div className="space-y-4">
          {stats.orders.shippingMethodDistribution
            .sort((a, b) => b.count - a.count)
            .map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-medium">{m.method}</span>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                    {m.count} طلب
                  </span>
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">
                    {m.revenue.toLocaleString()} ر.س
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    processing: "قيد المعالجة",
    shipping: "قيد الشحن",
    delivered: "تم التوصيل",
    cancelled: "ملغي"
  };
  return labels[status] || status;
}

function getStatusStyle(status: string): { backgroundColor: string; color: string } {
  const styles: Record<string, { backgroundColor: string; color: string }> = {
    pending: { backgroundColor: "#FEF3C7", color: "#92400E" },
    confirmed: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
    processing: { backgroundColor: "#E0E7FF", color: "#3730A3" },
    shipping: { backgroundColor: "#F3E8FF", color: "#6B21A8" },
    delivered: { backgroundColor: "#DCFCE7", color: "#166534" },
    cancelled: { backgroundColor: "#FEE2E2", color: "#991B1B" }
  };
  return styles[status] || { backgroundColor: "#F3F4F6", color: "#374151" };
}
