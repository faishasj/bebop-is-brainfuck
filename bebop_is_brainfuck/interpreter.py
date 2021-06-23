import argparse
from mido import MidiFile

SCALE = {
  'MAJOR': ['>', '', '<', '', '+', '-', '', '.', ',', '[', '', ']'],
  'MINOR': ['>', '', '<', '+', '', '-', '', '.', '', ',', '[', ']'],
  'DOMINANT': ['>', '', '<', '', '+', '-', '', '.', '', ',', '[', ']']
}

INSTRUCTION = {
  '>': 'shift_right',
  '<': 'shift_left',
  '+': 'increment_cell',
  '-': 'decrement_cell',
  '.': 'output',
  ',': 'input',
  '[': 'jump_open',
  ']': 'jump_close',
}


""" Bebop Is Brainfuck interpreter. """
class B2Interpreter:
  def __init__(self, filename, track_no=1, scale='MAJOR'):
    self.scale = scale
    self.tape = [0] * 300000
    self.data_ptr = 0
    self.instruction_ptr = 0
    self.jump_to = {}

    midi = MidiFile(filename)
    self.track = midi.tracks[track_no]

  """ Transpile MIDI track to Brainfuck. """
  def bebop_to_brainfuck(self):
    found_root_note = False
    root_note = -1
    track_ptr = 0
    brainfuck = ''

    # Find the root note
    while not found_root_note:
      msg = self.track[track_ptr]
      if msg.time == 0:
        if msg.type == 'note_on':
          if root_note == -1 or msg.note < root_note:
            root_note = msg.note
        track_ptr += 1
      else:
        found_root_note = True

    # Transpile the rest of the messages
    while track_ptr < len(self.track):
      msg = self.track[track_ptr]
      if msg.type == 'note_on':
        semitone = abs(root_note - msg.note) % 12
        if msg.note < root_note:
          semitone = 12 - semitone
        brainfuck += SCALE[self.scale][semitone]
      track_ptr += 1
    
    return brainfuck

  """ Evaluate MIDI track. """
  def evaluate(self):
    self.data_ptr = 0
    self.instruction_ptr = 0
    code = self.bebop_to_brainfuck()
    
    # Create jump table
    stack = []
    for idx, command in enumerate(code):
      if command == '[': 
        stack.append(idx)
      if command == ']':
        start = stack.pop()
        self.jump_to[start] = idx
        self.jump_to[idx] = start

    # Run instructions
    while self.instruction_ptr < len(code):
      command = getattr(self, INSTRUCTION[code[self.instruction_ptr]])
      command()
      self.instruction_ptr += 1

  """ Increment the data pointer. (>) """
  def shift_right(self):
    self.data_ptr += 1
    if self.data_ptr == 30000:
      self.data_ptr = 0

  """ Decremennt the data pointer. (<) """
  def shift_left(self):
    self.data_ptr -= 1
    if self.data_ptr == -1:
      self.data_ptr = 29999

  """ Increment the byte at the data pointer. (+) """
  def increment_cell(self):
    self.tape[self.data_ptr] += 1
    if self.tape[self.data_ptr] == 256:
      self.tape[self.data_ptr] = 0

  """ Decrement the byte at the data pointer. (-) """
  def decrement_cell(self):
    self.tape[self.data_ptr] -= 1
    if self.tape[self.data_ptr] == -1:
      self.tape[self.data_ptr] = 255

  """ Output the byte at the data pointer. (.) """
  def output(self): 
    print(chr(self.tape[self.data_ptr]), end='')

  """ Accept one byte of input, storing its value in the byte at the data pointer. (,) """
  def input(self):
    self.tape[self.data_ptr] = input('> ')[0]

  """ Jump past the matching ] if the byte at the data pointer is zero. ([) """
  def jump_open(self):
    if self.tape[self.data_ptr] == 0:
      self.instruction_ptr = self.jump_to[self.instruction_ptr]

  """ Jump back to the matching [ if the byte at the data pointer is nonzero. (]) """
  def jump_close(self):
    if self.tape[self.data_ptr] != 0:
      self.instruction_ptr = self.jump_to[self.instruction_ptr]


if __name__ == "__main__":
  parser = argparse.ArgumentParser(description='"Bebop is Brainfuck" Python interpreter.')
  parser.add_argument('filename', nargs=1, type=str)
  parser.add_argument('--track', '-T', action='store', type=int, dest='track_no', default=1)
  parser.add_argument('--scale', '-S', action='store', type=str, dest='scale', default='MAJOR')
  args = parser.parse_args()

  b2i = B2Interpreter(args.filename[0], args.track_no, args.scale.upper())
  b2i.evaluate()