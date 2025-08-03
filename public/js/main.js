document.addEventListener('DOMContentLoaded', () => {
    const attendanceDateInput = document.getElementById('attendanceDate');
    const attendanceTimeInput = document.getElementById('attendanceTime');
    const loadAttendanceBtn = document.getElementById('loadAttendanceBtn');
    const studentAttendanceForms = document.getElementById('studentAttendanceForms');
    const displayDateSpan = document.getElementById('displayDate');

    // Set today's date and current time as default
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    attendanceDateInput.value = formattedDate;
    displayDateSpan.textContent = formattedDate;

    // Function to render attendance forms/summary
    const renderAttendanceForms = async (date) => {
        studentAttendanceForms.innerHTML = '<p class="text-center text-gray-500">Loading attendance data...</p>';
        displayDateSpan.textContent = date;

        try {
            const response = await fetch(`/attendance/summary?date=${date}`);
            const result = await response.json();

            if (result.success) {
                const summary = result.summary;
                if (summary.length === 0) {
                    studentAttendanceForms.innerHTML = '<p class="text-center text-gray-600 italic">No students found or no attendance records for this date. Please add students if none exist.</p>';
                    return;
                }

                studentAttendanceForms.innerHTML = ''; // Clear previous content

                summary.forEach(student => {
                    const studentDiv = document.createElement('div');
                    studentDiv.className = 'student-attendance-card p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between transition-transform transform hover:scale-[1.01]';
                    studentDiv.innerHTML = `
                        <p class="font-semibold text-gray-800 text-lg mr-4 flex-grow"><i class="fas fa-user-circle mr-2 text-blue-500"></i>${student.student_name}</p>
                        <div class="flex space-x-2">
                            <button
                                data-student-id="${student.student_id}"
                                data-status="present"
                                class="mark-btn btn-present bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out flex items-center
                                ${student.attendance_records.some(rec => rec.status === 'present' && rec.attendance_time === attendanceTimeInput.value) ? 'bg-green-700' : ''}"
                            >
                                <i class="fas fa-check mr-1"></i> Present
                            </button>
                            <button
                                data-student-id="${student.student_id}"
                                data-status="absent"
                                class="mark-btn btn-absent bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out flex items-center
                                ${student.attendance_records.some(rec => rec.status === 'absent' && rec.attendance_time === attendanceTimeInput.value) ? 'bg-red-700' : ''}"
                            >
                                <i class="fas fa-times mr-1"></i> Absent
                            </button>
                        </div>
                    `;
                    studentAttendanceForms.appendChild(studentDiv);
                });

                // Add event listeners to the new buttons
                document.querySelectorAll('.mark-btn').forEach(button => {
                    button.addEventListener('click', handleMarkAttendance);
                });

            } else {
                studentAttendanceForms.innerHTML = `<p class="text-center text-red-500">Error: ${result.message}</p>`;
            }
        } catch (error) {
            console.error('Error fetching attendance summary:', error);
            studentAttendanceForms.innerHTML = '<p class="text-center text-red-500">Failed to load attendance data. Please try again.</p>';
        }
    };

    // Function to handle marking attendance
    const handleMarkAttendance = async (event) => {
        const button = event.currentTarget;
        const studentId = button.dataset.studentId;
        const status = button.dataset.status;
        const attendanceDate = attendanceDateInput.value;
        const attendanceTime = attendanceTimeInput.value;

        // Reset button states for this student at this time
        document.querySelectorAll(`.mark-btn[data-student-id="${studentId}"]`).forEach(btn => {
            btn.classList.remove('bg-green-700', 'bg-red-700');
            if (btn.dataset.status === 'present') {
                btn.classList.add('bg-green-500', 'hover:bg-green-600');
            } else {
                btn.classList.add('bg-red-500', 'hover:bg-red-600');
            }
        });

        // Highlight the clicked button
        if (status === 'present') {
            button.classList.add('bg-green-700');
            button.classList.remove('bg-green-500', 'hover:bg-green-600');
        } else {
            button.classList.add('bg-red-700');
            button.classList.remove('bg-red-500', 'hover:bg-red-600');
        }


        try {
            const response = await fetch('/attendance/mark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ studentId, attendanceDate, attendanceTime, status }),
            });
            const result = await response.json();

            if (!result.success) {
                // If API call fails, revert button state
                if (status === 'present') {
                    button.classList.remove('bg-green-700');
                    button.classList.add('bg-green-500', 'hover:bg-green-600');
                } else {
                    button.classList.remove('bg-red-700');
                    button.classList.add('bg-red-500', 'hover:bg-red-600');
                }
                console.error('Failed to mark attendance:', result.message);
                // In a real app, use a custom modal for alerts
                alert('Error marking attendance: ' + result.message);
            }
        } catch (error) {
            // If API call fails due to network or server error, revert button state
            if (status === 'present') {
                button.classList.remove('bg-green-700');
                button.classList.add('bg-green-500', 'hover:bg-green-600');
            } else {
                button.classList.remove('bg-red-700');
                button.classList.add('bg-red-500', 'hover:bg-red-600');
            }
            console.error('Network error marking attendance:', error);
            // In a real app, use a custom modal for alerts
            alert('Network error marking attendance. Please check your connection.');
        }
    };

    // Event listener for loading attendance
    if (loadAttendanceBtn) {
        loadAttendanceBtn.addEventListener('click', () => {
            renderAttendanceForms(attendanceDateInput.value);
        });
    }

    // Initial load of attendance for today
    if (attendanceDateInput) {
        renderAttendanceForms(attendanceDateInput.value);
    }
});
