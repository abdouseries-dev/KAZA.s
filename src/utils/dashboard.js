const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Store = require('../models/Store');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Product = require('../models/Product');

/**
 * إنشاء لوحة تحكم متقدمة
 */
async function createDashboard(userId, guildId) {
  try {
    // جلب البيانات من قاعدة البيانات
    const userStores = await Store.find({ ownerId: userId });
    const userOrders = await Order.find({ customerId: userId });
    const totalReviews = await Review.countDocuments({ customerId: userId });
    
    // حساب الإحصائيات
    const totalOrdersCount = userOrders.length;
    const pendingOrders = userOrders.filter(o => o.status === 'pending').length;
    const completedOrders = userOrders.filter(o => o.status === 'delivered').length;
    const totalRevenue = userStores.reduce((sum, store) => sum + store.revenue, 0);
    const averageRating = userStores.length > 0 
      ? (userStores.reduce((sum, store) => sum + store.rating, 0) / userStores.length).toFixed(1)
      : 0;

    // إنشاء الـ Embed الرئيسي
    const mainEmbed = new EmbedBuilder()
      .setColor('#2E86AB')
      .setTitle('📊 لوحة التحكم الرئيسية - KAZA')
      .setDescription('مرحباً بك في نظام إدارة المتاجر والطلبيات')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/1524/1524911.png')
      .addFields(
        {
          name: '📦 عدد متاجرك',
          value: `\`${userStores.length}\` متجر`,
          inline: true
        },
        {
          name: '🛒 إجمالي الطلبيات',
          value: `\`${totalOrdersCount}\` طلبية`,
          inline: true
        },
        {
          name: '⭐ متوسط التقييم',
          value: `\`${averageRating}\` / 5`,
          inline: true
        },
        {
          name: '✅ الطلبيات المكتملة',
          value: `\`${completedOrders}\` طلبية`,
          inline: true
        },
        {
          name: '⏳ الطلبيات المعلقة',
          value: `\`${pendingOrders}\` طلبية`,
          inline: true
        },
        {
          name: '💰 إجمالي الإيرادات',
          value: `\`${formatPrice(totalRevenue)}\``,
          inline: true
        }
      )
      .setFooter({ text: 'آخر تحديث: ' + new Date().toLocaleString('ar-SA') })
      .setTimestamp();

    // إنشاء أزرار التنقل
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('dashboard_stores')
          .setLabel('متاجري')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🏪'),
        new ButtonBuilder()
          .setCustomId('dashboard_orders')
          .setLabel('طلبياتي')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📋'),
        new ButtonBuilder()
          .setCustomId('dashboard_products')
          .setLabel('منتجاتي')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📦'),
        new ButtonBuilder()
          .setCustomId('dashboard_reviews')
          .setLabel('التقييمات')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⭐'),
        new ButtonBuilder()
          .setCustomId('dashboard_stats')
          .setLabel('الإحصائيات')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📊')
      );

    return { embeds: [mainEmbed], components: [buttons] };
  } catch (error) {
    console.error('خطأ في إنشاء لوحة التحكم:', error);
    throw error;
  }
}

/**
 * إنشاء لوحة تحكم المتاجر
 */
async function getStoresDashboard(userId) {
  try {
    const stores = await Store.find({ ownerId: userId });

    if (stores.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🏪 متاجري')
        .setDescription('ليس لديك أي متاجر حتى الآن');
      return { embeds: [embed] };
    }

    const embed = new EmbedBuilder()
      .setColor('#4ECDC4')
      .setTitle('🏪 قائمة متاجرك')
      .setDescription(`لديك **${stores.length}** متجر`)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/1524/1524911.png');

    stores.forEach((store, index) => {
      embed.addFields({
        name: `${index + 1}. ${store.storeName}`,
        value: `
🆔 المعرف: \`${store.storeId}\`
📂 الفئة: **${store.category}**
⭐ التقييم: **${store.rating}/5**
📊 الطلبيات: **${store.totalOrders}**
💰 الإيرادات: **${formatPrice(store.revenue)}**
🟢 الحالة: ${store.isActive ? '**نشط**' : '**غير نشط**'}`,
        inline: false
      });
    });

    return { embeds: [embed] };
  } catch (error) {
    console.error('خطأ في جلب لوحة المتاجر:', error);
    throw error;
  }
}

/**
 * إنشاء لوحة تحكم الطلبيات
 */
async function getOrdersDashboard(userId) {
  try {
    const orders = await Order.find({ customerId: userId }).limit(10);

    if (orders.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('📋 طلبياتي')
        .setDescription('ليس لديك أي طلبيات حتى الآن');
      return { embeds: [embed] };
    }

    const embed = new EmbedBuilder()
      .setColor('#95E1D3')
      .setTitle('📋 آخر طلبياتك')
      .setDescription(`لديك **${orders.length}** طلبية`)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3050/3050159.png');

    orders.forEach((order, index) => {
      const statusEmoji = {
        pending: '⏳',
        confirmed: '✅',
        shipped: '🚚',
        delivered: '🎉',
        cancelled: '❌'
      }[order.status] || '❓';

      const statusText = {
        pending: 'معلقة',
        confirmed: 'مؤكدة',
        shipped: 'مرسلة',
        delivered: 'مسلمة',
        cancelled: 'ملغاة'
      }[order.status] || 'غير معروفة';

      embed.addFields({
        name: `${statusEmoji} الطلبية #${index + 1} - ${order.orderId}`,
        value: `
📅 التاريخ: **${new Date(order.createdAt).toLocaleDateString('ar-SA')}**
💰 المبلغ: **${formatPrice(order.totalPrice)}**
📦 العدد: **${order.items.length}** منتج
🏪 المتجر: **${order.storeId}**
🔔 الحالة: **${statusText}**`,
        inline: false
      });
    });

    return { embeds: [embed] };
  } catch (error) {
    console.error('خطأ في جلب لوحة الطلبيات:', error);
    throw error;
  }
}

/**
 * إنشاء لوحة تحكم المنتجات
 */
async function getProductsDashboard(userId) {
  try {
    // جلب متاجر المستخدم أولاً
    const userStores = await Store.find({ ownerId: userId });
    const storeIds = userStores.map(s => s.storeId);

    const products = await Product.find({ storeId: { $in: storeIds } }).limit(10);

    if (products.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('📦 منتجاتي')
        .setDescription('ليس لديك أي منتجات حتى الآن');
      return { embeds: [embed] };
    }

    const embed = new EmbedBuilder()
      .setColor('#F38181')
      .setTitle('📦 آخر منتجاتك')
      .setDescription(`لديك **${products.length}** منتج`)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3143/3143615.png');

    products.forEach((product, index) => {
      const stockStatus = product.stock > 0 ? '✅ متوفر' : '❌ نافذ';
      embed.addFields({
        name: `${index + 1}. ${product.productName}`,
        value: `
🆔 المعرف: \`${product.productId}\`
💰 السعر: **${formatPrice(product.price)}**
📊 المخزون: **${product.stock}** وحدة (${stockStatus})
📂 الفئة: **${product.category}**
🏪 المتجر: **${product.storeId}**`,
        inline: false
      });
    });

    return { embeds: [embed] };
  } catch (error) {
    console.error('خطأ في جلب لوحة المنتجات:', error);
    throw error;
  }
}

/**
 * إنشاء لوحة تحكم التقييمات
 */
async function getReviewsDashboard(userId) {
  try {
    // جلب متاجر المستخدم أولاً
    const userStores = await Store.find({ ownerId: userId });
    const storeIds = userStores.map(s => s.storeId);

    const reviews = await Review.find({ storeId: { $in: storeIds } }).limit(10);

    if (reviews.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⭐ التقييمات')
        .setDescription('لم تتلقَ أي تقييمات حتى الآن');
      return { embeds: [embed] };
    }

    const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor('#FFE66D')
      .setTitle('⭐ التقييمات المتلقاة')
      .setDescription(`متوسط التقييم: **${averageRating}/5** من **${reviews.length}** تقييم`)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/2422/2422528.png');

    reviews.forEach((review, index) => {
      const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      embed.addFields({
        name: `${index + 1}. ${stars}`,
        value: `
👤 من: <@${review.customerId}>
💬 التعليق: **${review.comment || 'لا يوجد تعليق'}**
📅 التاريخ: **${new Date(review.createdAt).toLocaleDateString('ar-SA')}**`,
        inline: false
      });
    });

    return { embeds: [embed] };
  } catch (error) {
    console.error('خطأ في جلب لوحة التقييمات:', error);
    throw error;
  }
}

/**
 * إنشاء لوحة الإحصائيات المتقدمة
 */
async function getStatsDashboard(userId) {
  try {
    const stores = await Store.find({ ownerId: userId });
    const orders = await Order.find({ customerId: userId });
    const storeIds = stores.map(s => s.storeId);
    const products = await Product.find({ storeId: { $in: storeIds } });
    const reviews = await Review.find({ storeId: { $in: storeIds } });

    // حساب الإحصائيات
    const totalValue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const avgOrderValue = orders.length > 0 ? (totalValue / orders.length).toFixed(2) : 0;
    const topStore = stores.reduce((max, store) => store.revenue > max.revenue ? store : max, stores[0] || {});
    const totalProducts = products.length;
    const outOfStockProducts = products.filter(p => p.stock === 0).length;

    const embed = new EmbedBuilder()
      .setColor('#6C5CE7')
      .setTitle('📊 الإحصائيات المتقدمة')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3143/3143615.png')
      .addFields(
        { name: '🏪 إجمالي المتاجر', value: `\`${stores.length}\` متجر`, inline: true },
        { name: '📦 إجمالي المنتجات', value: `\`${totalProducts}\` منتج`, inline: true },
        { name: '⚠️ المنتجات النافذة', value: `\`${outOfStockProducts}\` منتج`, inline: true },
        { name: '🛒 إجمالي الطلبيات', value: `\`${orders.length}\` طلبية`, inline: true },
        { name: '💰 إجمالي القيمة', value: `\`${formatPrice(totalValue)}\``, inline: true },
        { name: '📈 متوسط قيمة الطلبية', value: `\`${formatPrice(avgOrderValue)}\``, inline: true },
        { name: '⭐ إجمالي التقييمات', value: `\`${reviews.length}\` تقييم`, inline: true },
        { name: '🥇 أفضل متجر', value: topStore.storeName ? `**${topStore.storeName}**` : 'لا يوجد', inline: true },
        { name: '💎 أعلى إيرادات', value: topStore.revenue ? `\`${formatPrice(topStore.revenue)}\`` : 'لا يوجد', inline: true }
      )
      .setFooter({ text: 'بيانات محدثة: ' + new Date().toLocaleString('ar-SA') });

    return { embeds: [embed] };
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
    throw error;
  }
}

/**
 * دالة تنسيق السعر
 */
function formatPrice(price) {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(price);
}

module.exports = {
  createDashboard,
  getStoresDashboard,
  getOrdersDashboard,
  getProductsDashboard,
  getReviewsDashboard,
  getStatsDashboard,
  formatPrice
};
