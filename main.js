import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { loadUsers, getUserByUid } from "./users.js";
import { listenTweets } from "./tweets.js";
import { loadFriends } from "./friends.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadUsers();
    await loadFriends(user.uid);

    listenTweets((tweets) => {
      console.log("tweets:", tweets);
    });
  }
});

