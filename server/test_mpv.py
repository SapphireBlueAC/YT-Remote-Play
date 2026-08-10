import mpv
import time

m = mpv.MPV(video=False)
@m.event_callback("end-file")
def on_end(event):
    print("REASON:", event.event.reason if event.event else None)

m.play("https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3")
m.seek(346)
time.sleep(3)
