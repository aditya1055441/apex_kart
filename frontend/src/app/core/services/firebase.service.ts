import { Injectable } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, Auth, UserCredential } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyCn14oqyw57KmNHkIypDr9_XnYFVrInQq8",
  authDomain: "eccomerce-app-f007a.firebaseapp.com",
  projectId: "eccomerce-app-f007a",
  storageBucket: "eccomerce-app-f007a.firebasestorage.app",
  messagingSenderId: "370240062995",
  appId: "1:370240062995:web:619b4107da4e178f2b61e6"
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  private auth: Auth;
  private googleProvider: GoogleAuthProvider;

  constructor() {
    this.app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    this.auth = getAuth(this.app);
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }

  public async signInWithGoogle(): Promise<UserCredential> {
    return signInWithPopup(this.auth, this.googleProvider);
  }
}
