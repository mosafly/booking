import { Bouncy } from 'ldrs/react'
import 'ldrs/react/Bouncy.css'

export const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <Bouncy size="35" speed="1.75" color="black" />
    </div>
  )
}
