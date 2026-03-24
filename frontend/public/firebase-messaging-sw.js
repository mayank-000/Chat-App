importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyA5edV3oEYkU-04XujKOtED8AC7T0KmGXM",
    authDomain: "chatapp-557f5.firebaseapp.com",
    projectId: "chatapp-557f5",
    storageBucket: "chatapp-557f5.firebasestorage.app",
    messagingSenderId: "926513330612",
    appId: "1:926513330612:web:09e0a73f21ec6699299ae1",
    measurementId: "G-VDR8DB390Q"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload);

    const { title, body } = payload.notification;

    self.registration.showNotification(title, {
        body: body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: payload.data        
    });
});

// When user clicks the notification — focus the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('/');
        })
    );
});