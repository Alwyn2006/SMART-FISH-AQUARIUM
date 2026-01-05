# 🐟 AI-Enabled Smart Aquarium System using ESP32-CAM & IoT

An AI-enabled Smart Aquarium System that combines IoT sensors and edge AI to monitor fish behavior and water quality in real time. The system uses an ESP32-CAM with a CNN–LSTM model to automate feeding, aeration, and filtration, improving efficiency, stability, and sustainability in aquaculture environments.

---

## 📌 Project Overview

Traditional aquarium systems rely on manual feeding or fixed timers, leading to overfeeding, poor water quality, and increased maintenance.  
This project introduces an intelligent, self-learning system that:

- Observes fish behavior using computer vision  
- Monitors water parameters continuously using IoT sensors  
- Makes real-time decisions locally on the ESP32-CAM  
- Automatically controls feeding and water systems  

The result is a fully autonomous, energy-efficient, and sustainable smart aquarium.

---

## ✨ Features

- Real-time fish behavior monitoring using ESP32-CAM  
- CNN–LSTM based feeding prediction model  
- Multi-sensor water quality monitoring (pH, temperature, turbidity, TDS, ammonia, DO)  
- Automated feeding, aeration, and filtration  
- Edge AI inference with low latency  
- MQTT-based cloud dashboard for monitoring  
- Reduced feed waste and energy consumption  

---

## 🧠 AI & Decision Logic

- **CNN** extracts spatial features from live camera frames  
- **LSTM** analyzes temporal fish activity patterns  
- Feeding is triggered only when behavior and environmental conditions are optimal  
- Sensor fusion ensures water stability before actuation  

---

## 🔧 Hardware Components

- ESP32-CAM  
- Temperature Sensor (DS18B20)  
- pH Sensor  
- Turbidity Sensor  
- TDS Sensor  
- Ammonia Sensor  
- Dissolved Oxygen Sensor  
- Servo Motor (automatic feeder)  
- Relay Module (pump & aeration control)  
- Ultrasonic Sensor (water level)  
- Power supply with battery backup  

---

## 💻 Software Stack

- ESP-IDF (Firmware)  
- TensorFlow Lite for Microcontrollers  
- MQTT Protocol  
- Node-RED  
- InfluxDB  
- Grafana Dashboard  

---

## 📊 Experimental Results

- Feeding accuracy: **95%**  
- Feed waste reduction: **40%**  
- Water quality stability improvement: **35%**  
- Energy savings: **35%**  
- Reduced fish mortality  

Tested continuously over 72 hours and compared against manual and timer-based systems.

---

## 📁 Project Structure

smart-aquarium/
├── firmware/
│ ├── sensors/
│ ├── ai_inference/
│ └── control_logic/
├── ai_model/
│ ├── training/
│ └── model.tflite
├── dashboard/
│ └── grafana_dashboard.json
├── docs/
│ └── research_paper.pdf
└── README.md

yaml
Copy code

---

## 🚀 Getting Started

1. Assemble the hardware and connect all sensors to the ESP32-CAM  
2. Flash the firmware using ESP-IDF  
3. Configure MQTT broker and cloud dashboard  
4. Power on the system and monitor real-time data  

---

## 🌱 Sustainability Impact

- Reduced ammonia buildup due to optimized feeding  
- Improved water quality stability  
- Lower energy consumption through adaptive control  
- Supports responsible and sustainable aquaculture  

---

## 🔮 Future Enhancements

- Fish disease detection using vision AI  
- Federated learning across multiple aquariums  
- Blockchain-based data integrity  
- Solar-powered operation  
- Self-cleaning sensor mechanisms  

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Contributions

Contributions, issues, and feature requests are welcome.  
Feel free to fork the repository and submit pull requests.
