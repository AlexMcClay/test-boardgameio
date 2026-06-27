import { AnimatePresence, motion } from "motion/react";
import {
  IoClose,
  IoPerson,
  IoPencil,
} from "react-icons/io5";

interface UserProfileOverlayProps {
  isOpen: boolean;
  onClose: () => void;  
  isEditing: boolean;
  setIsEditing?: React.Dispatch<React.SetStateAction<boolean>>;
}

const UserProfileOverlay = ({ isOpen, onClose, isEditing, setIsEditing }: UserProfileOverlayProps) => {
 

  

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl border-2 border-gray-700 p-[1.5vw] max-w-[35vw] w-full mx-[1vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-[0.8vw] right-[0.8vw] text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Close settings"
            >
              <IoClose className="w-[1.3vw] h-[1.3vw]" />
            </button>

            {/* Header */}
            <h2 className="text-[1.6vw] font-bold text-white mb-[1vw]">
              User Profile
            </h2>

            {/* User Info */}
            {isOpen && !isEditing && (
            <div className="flex items-center gap-[1vw] mb-[1vw]">
              <IoPerson className="w-[2.5vw] h-[2.5vw] text-gray-400" />
              <p className="text-[1.4vw] text-white">
                {localStorage.getItem("user_name") || "Guest"}
              </p>
              { /* Edit Profile Button */}
              <button className="text-[1.2vw] rounded-md bg-blue-500 hover:bg-blue-600 text-white py-[0.5vw] px-[1vw]"
                onClick={() => {
                  // Handle edit profile action
                  
                  if (setIsEditing) {
                    setIsEditing(true);
                  }
                }}
              >
                
                <IoPencil className="inline w-[1.2vw] h-[1.2vw] mr-[0.3vw]" />
              </button>
            </div>
            )}            

            {isOpen && isEditing && (
              <div className="flex flex-col gap-[1vw] mb-[1vw]">
                <input
                  type="text"
                  defaultValue={localStorage.getItem("user_name") || "Guest"}
                  className="p-[0.5vw] rounded border border-gray-600 bg-gray-800 text-white text-[1.2vw]"
                />
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white py-[0.5vw] px-[1vw] rounded text-[1.2vw]"
                  onClick={() => {
                    // Handle save profile action
                    const newName = (document.querySelector('input') as HTMLInputElement).value;
                    localStorage.setItem("user_name", newName);
                    if (setIsEditing) {
                      setIsEditing(false);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            )}
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserProfileOverlay;
