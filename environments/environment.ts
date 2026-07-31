// 8081 et non 8080 : un conteneur Authentik, lancé par le démon Docker système
// (root, invisible depuis `docker ps`), occupe 8080 en permanence sur ce poste.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081',
};
