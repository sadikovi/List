// set "off" icon and empty badge
List.setIcon(false);
List.setBadge("");

document.addEventListener('DOMContentLoaded', function () {
    List.authorize(success, error);
});
