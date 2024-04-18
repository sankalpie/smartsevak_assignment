import express from "express";
import path from "path";
import fs from "fs";

//reading the JSON file
const availabilityData = fs.readFileSync('availability.json');
const availability = JSON.parse(availabilityData);
// console.log(availability.availabilityTimings["monday"]);

const app = express();

app.use(express.static(path.join(path.resolve(), "public")));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Function to check if a given time falls within a slot
function isTimeWithinSlot(inputTime, slot) {
    inputTime = parseInt(inputTime.replace(":", ""));

    const slotStart = parseInt((slot.start).replace(":", ""));

    const slotEnd = parseInt((slot.end).replace(":", ""));

    if (inputTime >= slotStart && inputTime <= slotEnd)
        return String(slotStart);
    else
        return false;
}

function compareTime(time1, time2) {
    const [hours1, minutes1] = time1.split(":").map(Number);
    const [hours2, minutes2] = time2.split(":").map(Number);

    if (hours1 < hours2) return -1;
    if (hours1 > hours2) return 1;
    if (minutes1 < minutes2) return -1;
    if (minutes1 > minutes2) return 1;
    return 0;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}



app.get("/", (req, res) => {

});

app.get("/doctor-availability", (req, res) => {
    const inputDate = req.query.date;
    const inputTime = req.query.time;
    const currentDate = new Date();
    const dateString = inputDate ? String(inputDate) : "Please enter date";
    const timeString = inputTime ? String(inputTime) : "Please enter time";

    if (inputDate && inputTime) {
        // If input date is today and input time is in the past then give error message
        const inputDateTime = new Date(inputDate + " " + inputTime);
        console.log("Input date time is");
        console.log(inputDateTime);
        if (inputDateTime < currentDate) {
            res.render("checker", { dateString: dateString, timeString: timeString, message: "Please select time in the future only", nextAvailableSlot: "" });
        } else {
            // kuch aur

            const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][inputDateTime.getDay()];
            const availableSlots = availability.availabilityTimings[dayOfWeek];

            console.log(dayOfWeek);
            console.log(availableSlots);

            if (!availableSlots ) {
                // If no slots available for the requested day, return an error
                res.render("checker", { dateString: dateString, timeString: timeString, message: "Doctor is not available on the whole day", nextAvailableSlot: "" });
                
                return;
            }

            let isNextSlotNeeded = true;


            for (let i = 0; i < availableSlots.length; i++) {
                const slot = availableSlots[i];
                if (isTimeWithinSlot(inputTime, slot)) {
                    // Doctor available for the requested time
                    isNextSlotNeeded = !(isNextSlotNeeded);
                    res.render("checker", { dateString: dateString, timeString: timeString, message: "Doctor is available at the specified date and time", nextAvailableSlot: "" });
                    res.json({"isAvailable":true});
                    return;
                }
            }

            if (isNextSlotNeeded) {
                //is next slot needed condition
                let nextSlotDate = new Date(inputDateTime); 

                while (true) {
                    // Loop through the available slots for the current day
                    for (let i = 0; i < availableSlots.length; i++) {
                        const slot = availableSlots[i];
                        if (compareTime(inputTime, slot.end) < 0) {
                            // slot found
                            nextSlotDate.setHours(slot.start.split(":")[0]);
                            nextSlotDate.setMinutes(slot.start.split(":")[1]);
                            res.render("checker", {
                                dateString: dateString,
                                timeString: timeString,
                                message: "Doctor is not available at the specified time",
                                nextAvailableSlot: {
                                    date: formatDate(nextSlotDate),
                                    time: slot.start
                                }
                            });

                            res.json({"isAvailable":false,
                                        "nextAvailableSlot":{
                                            date:formatDate(nextSlotDate),
                                            time:slot.start
                                        }
                                    });
                            return;
                        }
                    }

                    // If no next slot found for the current day add 1 day
                    nextSlotDate.setDate(nextSlotDate.getDate() + 1); // Increment the date by 1
                    const nextDayIndex = nextSlotDate.getDay();
                    const nextDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][nextDayIndex];
                    const nextAvailableSlots = availability.availabilityTimings[nextDay];
                    if (nextAvailableSlots && nextAvailableSlots.length > 0) {
                        // Next available slot found on the next day
                        nextSlotDate.setHours(nextAvailableSlots[0].start.split(":")[0]);
                        nextSlotDate.setMinutes(nextAvailableSlots[0].start.split(":")[1]);
                        res.render("checker", {
                            dateString: dateString,
                            timeString: timeString,
                            message: "Doctor is not available at the specified time",
                            nextAvailableSlot: {
                                date: formatDate(nextSlotDate),
                                time: nextAvailableSlots[0].start
                            }
                        });

                        res.json({"isAvailable":false,
                                        "nextAvailableSlot":{
                                            date:formatDate(nextSlotDate),
                                            time:slot.start
                                        }
                                    });
                        return;
                    } else {
                        //continue until slot is actually found
                        //wont get stuck in an infinite loop because we already handled the case of no available slots 
                        continue;
                    }
                }
                //is next slot needed condition ends here
            } else {
                // If no available slots found
                res.render("checker", { dateString: dateString, timeString: timeString, message: "No available slots found", nextAvailableSlot: "" });
            }
        }
    } else {
        res.render("checker", { dateString: dateString, timeString: timeString, message: "Kindly select both Date and Time", nextAvailableSlot: "" });
    }

});

app.listen(5000, () => {
    console.log("Server is listening");
})