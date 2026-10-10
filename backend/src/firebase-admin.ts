const admin = require('firebase-admin');

const app = (!admin.apps || admin.apps.length === 0)
  ? admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'eccomerce-app-f007a'
    })
  : admin.getApp();

// Lazy-attach auth so admin.auth() works when called
if (typeof admin.auth !== 'function') {
  admin.auth = (appInstance?: any) => {
    try {
      const { getAuth } = require('firebase-admin/auth');
      return getAuth(appInstance || app);
    } catch (e: any) {
      // In environments where firebase-admin/auth is already mounted or mock is used
      return {
        verifyIdToken: async (token: string) => {
          throw new Error('Firebase Auth verifyIdToken could not be initialized: ' + e.message);
        }
      };
    }
  };
}

export = admin;
