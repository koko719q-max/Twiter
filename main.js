// ── Imports ───────────────────────────────────────────
import "./warn.js";
import "./system.js";
import "./color.js";
import { openRewards } from "./rewards.js";
import "./auth.js"; // boots onAuthStateChanged

import { login, register, logout } from "./auth.js";
import { addTweet, like, openLightbox, closeLightbox, previewImage, removeImage } from "./tweets.js";
import { toggleComments, addComment } from "./comments.js";
import { openFriends, addFriend, confirmFriend, declineFriend, searchUsers } from "./friends.js";
import { openProfile, openMyProfile, closeProfile } from "./profile.js";
import { uploadProfilePic, updateUsername } from "./profile.js";
import { handleAlertCommand, handleBackupCommand } from "./commands.js";
import { backToFeed, goHome, showLogin, showRegister } from "./ui.js";

// ── Window exports (used by HTML onclick="...") ───────
window.openRewards = openRewards;
window.login           = login;
window.register        = register;
window.logout          = logout;

window.addTweet        = addTweet;
window.like            = like;
window.openLightbox    = openLightbox;
window.closeLightbox   = closeLightbox;
window.previewImage    = previewImage;
window.removeImage     = removeImage;

window.toggleComments  = toggleComments;
window.addComment      = addComment;

window.openFriends     = openFriends;
window.addFriend       = addFriend;
window.confirmFriend   = confirmFriend;
window.declineFriend   = declineFriend;
window.searchUsers     = searchUsers;

window.openProfile     = openProfile;
window.openMyProfile   = openMyProfile;
window.closeProfile    = closeProfile;
window.uploadProfilePic = uploadProfilePic;
window.updateUsername  = updateUsername;

window.handleAlertCommand  = handleAlertCommand;
window.handleBackupCommand = handleBackupCommand;

window.backToFeed      = backToFeed;
window.goHome          = goHome;
window.showLogin       = showLogin;
window.showRegister    = showRegister;
