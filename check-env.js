// 检查环境变量
console.log('Environment Variables:');
console.log('  STATIC_EXPORT:', process.env.STATIC_EXPORT);
console.log('  NEXT_PRIVATE_STATIC_EXPORT:', process.env.NEXT_PRIVATE_STATIC_EXPORT);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  CUSTOM_DOMAIN:', process.env.CUSTOM_DOMAIN);
console.log('  NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);

const isStaticExport = process.env.NODE_ENV !== 'development' && 
  (String(process.env.STATIC_EXPORT).toLowerCase() === 'true' || 
   String(process.env.NEXT_PRIVATE_STATIC_EXPORT).toLowerCase() === 'true');

console.log('\nCalculated Values:');
console.log('  isStaticExport:', isStaticExport);
console.log('  String(STATIC_EXPORT):', String(process.env.STATIC_EXPORT));
console.log('  toLowerCase:', String(process.env.STATIC_EXPORT).toLowerCase());
