import mpv
import time

m = mpv.MPV(video=False, ytdl=False, log_handler=print)
print("Playing Kalimba...")
m.play("https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3")
time.sleep(3)
