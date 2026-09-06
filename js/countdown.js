(function () {
  function getTargetTimestamp() {
    var now = new Date();
    var y = now.getUTCFullYear();
    // Sept 21 12:00 GMT-3 is 15:00 UTC (Month index 8 = September)
    var t = Date.UTC(y, 8, 21, 15, 0, 0);
    if (t <= now.getTime()) {
      t = Date.UTC(y + 1, 8, 21, 15, 0, 0);
    }
    return t;
  }

  function initCountdown() {
    var target = getTargetTimestamp();
    var daysEl = document.getElementById('cd-days');
    var hoursEl = document.getElementById('cd-hours');
    var minutesEl = document.getElementById('cd-minutes');
    var secondsEl = document.getElementById('cd-seconds');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    function pad(n) {
      var val = Math.max(0, Math.floor(n || 0));
      return val < 10 ? '0' + val : '' + val;
    }

    var lastSec = -1;

    function updateCountdown() {
      var now = Date.now();
      var diff = target - now;

      if (diff <= 0) {
        target = getTargetTimestamp();
        diff = target - now;
      }

      var totalSec = Math.floor(diff / 1000);
      var days = Math.floor(totalSec / 86400);
      var hours = Math.floor((totalSec % 86400) / 3600);
      var minutes = Math.floor((totalSec % 3600) / 60);
      var seconds = totalSec % 60;

      if (seconds !== lastSec) {
        secondsEl.classList.remove('tick-pulse');
        void secondsEl.offsetWidth; // trigger reflow to restart animation
        secondsEl.classList.add('tick-pulse');
        lastSec = seconds;
      }

      daysEl.textContent = pad(days);
      hoursEl.textContent = pad(hours);
      minutesEl.textContent = pad(minutes);
      secondsEl.textContent = pad(seconds);
    }

    updateCountdown();
    setInterval(updateCountdown, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountdown);
  } else {
    initCountdown();
  }
})();
