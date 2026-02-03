from services.indicator_worker import start_indicator_worker
import threading

if __name__ == "__main__":
    print("[INIT] Starting Python Strategy Worker...")

    t = threading.Thread(target=start_indicator_worker)
    t.daemon = True
    t.start()

    while True:
        pass
