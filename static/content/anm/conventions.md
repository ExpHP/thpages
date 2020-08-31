# Conventions

Touhou games primarily use the conventions of Direct3D for defining transformations in 3-dimensional space.

## Coordinate convention

Direct3D screen coordinates primarily use the following coordinate system, which is fairly common in computing:

* +x points **to the right**.
* +y points **down**.
* +z points **out of the screen**.

This creates a **left-handed coordinate system**, in contrast to the right-handed system you would normally see in a general math class.

A positive rotation around z is defined to rotate +x towards +y.  To a viewer looking at the screen head-on, positive rotations therefore appear to be **clockwise.**
When it comes to rotations in 3D space, the words "clockwise" and "counter-clockwise" become ambiguous, so I will simply define x and y rotations as follows:

* A positive rotation around the x axis rotates +y towards +z.
* A positive rotation around the y axis rotates +z towards +x.

## Matrix convention

A lot of people seem to think that matrix convention is as simple as "row-major vs column-major," or "C-order versus Fortran order," but there's a fair bit more to it than that.  For instance, I've seen some people describe Direct3D matrices as column-major.  It's easy to see *why* someone might believe this, but thinking this way will only lead to confusion when you use e.g. matrix multiplication functions (where the argument order will appear wrong to somebody thinking in column-major).

Direct3D matrices are **stored row-major** and formally operate on **row vectors.** Let's go over what both of these mean.

### Mathematical formalism: Row-based

Matrix math taught in school typically uses a column-based formalism, so it's worth showing what row-based formalism looks like.  As you might imagine, a "row-based" formalism is one where we primarily work with row vectors instead of column vectors:

```
         Column-based                          Row-based
  [x']   [m00 m01 m02] [x]                               [m00 m01 m02]
  [y'] = [m10 m11 m12] [y]       [x' y' z'] = [x  y  z ] [m10 m11 m12]
  [z']   [m20 m21 m22] [z]                               [m20 m21 m22]
```

Notice how in the row-based formalism, you multiply matrices **on the right.**  Likewise, unlike in column-based formalism where transformation matrices compose from right to left, in the row-based formalism they compose **from left to right**: That is, **A&nbsp;B&nbsp;C** is the matrix that first transforms a vector by **A**, then by **B**, and finally by **C**.  Easy.

Like any good graphics library, Direct3D uses affine transformations that include translation, so matrices are actually 4x4.  Row-based formalism puts the translation vector at the bottom.

```
                               [m00  m01  m02  0]
                               [m10  m11  m12  0]     (w = 1 for points,
   [x' y' z' w] = [x  y  z  w] [m20  m21  m22  0]      w = 0 for vectors)
                               [ tx   ty   tz  1]
```

Rotation matrices look like this.  This is probably the transpose of what you're used to seeing:

```
          x-rotation                y-rotation               z-rotation
    [1    0      0     0]     [cos(θ) 0 -sin(θ) 0]     [ cos(θ) sin(θ)  0   0]
    [0  cos(θ) sin(θ)  0]     [ 0     1    0    0]     [-sin(θ) cos(θ)  0   0]
    [0 -sin(θ) cos(θ)  0]     [sin(θ) 0  cos(θ) 0]     [   0      0     1   0]
    [0    0      0     1]     [ 0     0    0    1]     [   0      0     0   1]
```

### Data order: Vector-major

I would actually describe the data order as "vector-major".  This means that, if you have a matrix containing a number of 4-vectors that you want to transform, they will be stored in the order

```
  x0 y0 z0 w0  x1 y1 z1 w1  x2 y2 z2 w2 ...
```

This alone almost fully specifies how the majority of the source code should look, regardless of the formalism.  However, people don't generally use the term "vector-major," so I will also say that the matrices are **row-major** (reading order) since we're operating on row-vectors.

As an aside, on so-called "FORTRAN order:" FORTRAN matrices are also vector-major, meaning that C code written to operate on FORTRAN matrices will tend to look similar to C code written to work on Direct3D matrices.  However, FORTRAN is thoroughly entrenched in the column-based formalism.

## Color

Whenever Touhou games use a single DWORD to store a color, it is always a `D3DCOLOR`.  This is a type defined as follows:

[code]
struct D3DCOLOR {
    unsigned char blue;
    unsigned char green;
    unsigned char red;
    unsigned char alpha;
}
[/code]

x86 is a little-endian, so when written as a single integer this is `0xAARRGGBB`, in contrast to the alpha-last `#RRGGBBAA` notation that is common outside of Direct3D.

