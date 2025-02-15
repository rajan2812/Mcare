import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"]

export function Schedule() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-white">Time</TableHead>
            {weekDays.map((day) => (
              <TableHead key={day} className="text-center">
                {day}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {timeSlots.map((time) => (
            <TableRow key={time}>
              <TableCell className="sticky left-0 bg-white font-medium">{time}</TableCell>
              {weekDays.map((day) => (
                <TableCell key={`${day}-${time}`} className="text-center">
                  <Badge variant={Math.random() > 0.7 ? "secondary" : "outline"}>
                    {Math.random() > 0.7 ? "Booked" : "Available"}
                  </Badge>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

