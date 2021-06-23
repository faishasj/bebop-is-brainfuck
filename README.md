# Bebop is Brainfuck!

A [Brainfuck](https://esolangs.org/wiki/Brainfuck)-equivalent esoteric programming language based on Bebop scales. (Abbreviation: B2)

## Why Bebop scales?

Bebop scales add a chromatic passing note to common 7-note scales, thus leading to an 8-note scale. This means we can map each interval in a Bebop scale to a Brainfuck command.
B2 currently supports three types of Bebop scales:

### Bebop major scale

![](https://upload.wikimedia.org/score/q/0/q0k0eqbr2itrtgtcwgykblh6w551a8y/q0k0eqbr.png)

Ionian mode (a.k.a. major scale) with a chromatic passing tone between the 5th and 6th notes. Also known as the major sixth diminished scale.

### Bebop minor scale

![](https://upload.wikimedia.org/score/3/k/3kuhhr8nohlesn6a5k4x3y6hl6x9wvu/3kuhhr8n.png)

Dorian mode with a major seventh note between the dominant 7th and the tonic.

### Bebop dominant scale

Mixolydian mode with a chromatic passing tone between the flattened 7th (b7) and the root.

## How to code in Bebop is Brainfuck!

B2 programs are actually MIDI files. This means that your IDE can be Sibelius, FL Studio, or any DAW or music notation program that can produce MIDI. 
Connect a MIDI keyboard and prepare to write code!

B2 will only evaluate notes on one track. This track is called the *program track* and notes within this track are called *program notes*.
The program track can be specified as a command line argument to the interpreter. Other tracks in the MIDI file are ignored.

Each command is represented by an interval. To establish the key, B2 will read the starting note in the program track and call it the *root note*. 
If there are multiple starting notes, the lowest note is taken to be the root note.
The following notes are then converted to intervals (difference in semitones) from the root note. 
An interval maps to a Brainfuck command based on the Bebop scale, which can be specified as a command line argument to the interpreter.

> If you transpose a B2 program to a new key, it will transpile to the same Brainfuck code and evaluate the exact same.

#### Mapping of semitonal difference to Brainfuck command
 
| | Major | Minor | Dominant |
|-|-------|-------|----------|
|```>```| 0 | 0 | 0 |
|```<```| 2 | 2 | 2 |
|```+```| 4 | 3 | 4 |
|```-```| 5 | 5 | 5 |
|```.```| 7 | 7 | 7 |
|```,```| 8 | 9 | 9 |
|```[```| 9 | 10 | 10 |
|```]```| 11 | 11 | 11 |

If a note in the program track does not map to a valid interval/command, it is ignored. This means that not all program notes are evaluated.

#### Brainfuck commands
| Character | Meaning |
| --------- | ------- |
|```>```| increment the data pointer (to point to the next cell to the right).|
|```<```| decrement the data pointer (to point to the next cell to the left).|
|```+```| increment (increase by one) the byte at the data pointer.|
|```-```| decrement (decrease by one) the byte at the data pointer.|
|```.```| output the byte at the data pointer.|
|```,```| accept one byte of input, storing its value in the byte at the data pointer.|
|```[```| if the byte at the data pointer is zero, then instead of moving the instruction pointer forward to the next command, jump it forward to the command after the matching ] command.|
|```]```| if the byte at the data pointer is nonzero, then instead of moving the instruction pointer forward to the next command, jump it back to the command after the matching [ command.|

#### Command line arguments

|Argument|Description|
|---|---|
|filename|Name of the MIDI file.|
|```--track``` or ```-T``` | Track number that contains program notes. Default program track is 1.|
|```--scale``` or ```-S``` | Type of Bebop scale. Can be ```MAJOR```, ```MINOR```, or ```DOMINANT```. Default scale is ```MAJOR```.|
