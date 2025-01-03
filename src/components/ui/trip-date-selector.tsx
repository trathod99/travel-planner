  <div className="flex items-center justify-between gap-4">
    <button
      onClick={handlePrevClick}
      disabled={isFirstDateVisible}
      data-testid="prev-date-button"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <div className="relative flex-1 overflow-hidden text-center">
      <div
        className="flex transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(calc(50% - ${BUTTON_WIDTH / 2}px))` }}
      >
        {dates.map((date) => (
          <button
            key={date.toISOString()}
            onClick={() => onDateSelect(date)}
            className={cn(
              'flex-shrink-0 w-24 px-4 py-2 rounded-md transition-colors',
              isDateEqual(date, selectedDate)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            {format(date, 'MMM d')}
          </button>
        ))}
      </div>
    </div>
    <button
      onClick={handleNextClick}
      disabled={isLastDateVisible}
      data-testid="next-date-button"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div> 