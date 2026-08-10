import mpv
import time

# Enable ytdl!
m = mpv.MPV(video=False, ytdl=True, log_handler=print)
print("Playing via ytdl...")
m.play("https://music.youtube.com/watch?v=4rDMvIZ4nWE")
time.sleep(10)
