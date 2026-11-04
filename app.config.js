/**
 * Configuration dynamique par-dessus app.json.
 *
 * Les apps iOS et Android appellent les routes /api avec des URL relatives :
 * expo-router les résout par rapport à `origin`, l'URL du serveur déployé sur
 * EAS Hosting. Elle vient de API_ORIGIN (ex. https://cle-de-12.expo.app).
 * Sans elle, un build de production n'atteindrait jamais le serveur et tous les
 * diagnostics retomberaient sur la base hors ligne : le build échoue donc.
 */
module.exports = ({ config }) => {
  const origin = process.env.API_ORIGIN?.replace(/\/$/, '');
  if (!origin && process.env.EAS_BUILD_PROFILE === 'production') {
    throw new Error('API_ORIGIN manquant : renseignez l’URL du serveur EAS Hosting dans les variables du profil production.');
  }
  const plugins = (config.plugins ?? []).map((plugin) => {
    const [name, options] = Array.isArray(plugin) ? plugin : [plugin, {}];
    if (name !== 'expo-router' || !origin) return plugin;
    return [name, { ...options, origin }];
  });
  return { ...config, plugins };
};
