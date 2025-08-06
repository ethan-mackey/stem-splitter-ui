import React, { useState, useEffect, useRef } from "react";

const CustomDropdown = ({
  options,
  placeholder = "Select an option",
  value,
  onChange,
  className = "",
  pushContent = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || "");
  const dropdownRef = useRef(null);

  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  
  useEffect(() => {
    setSelectedValue(value || "");
  }, [value]);

  const handleSelect = (optionValue, optionLabel) => {
    setSelectedValue(optionValue);
    setIsOpen(false);
    if (onChange) {
      onChange(optionValue);
    }
  };

  const getSelectedLabel = () => {
    const selected = options.find((opt) => opt.value === selectedValue);
    return selected ? selected.label : placeholder;
  };

  return (
    <div className={`dash-select-wrapper ${className} ${isOpen && pushContent ? "dropdown-open" : ""}`} ref={dropdownRef}>
      <div
        className={`dash-select ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{getSelectedLabel()}</span>
        <div className="dash-select-chevron"></div>
      </div>

      <div className={`dash-dropdown ${isOpen ? "open" : ""}`}>
        {options.map((option) => (
          <div
            key={option.value}
            className={`dash-option ${
              selectedValue === option.value ? "selected" : ""
            }`}
            onClick={() => handleSelect(option.value, option.label)}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomDropdown;
