import cv2
import time

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

if cap.isOpened():
    time.sleep(1)
    ret, frame = cap.read()
    if ret:
        cv2.imshow("Test", frame)
        cv2.waitKey(3000)

cap.release()
cv2.destroyAllWindows()
cv2.waitKey(1)  # <-- sometimes needed to fully close window
